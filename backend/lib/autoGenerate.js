const supabase = require('./supabase')

const MONTH_LABELS = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December']

/**
 * Auto-generates all missing monthly fee entries for a school
 * up to and including the current month.
 *
 * Safe to run repeatedly — existing entries are never duplicated.
 *
 * @param {string} school_id
 * @param {string|null} only_learner_id  — if set, only generates for this learner
 * @returns {{ created: number, skipped: number }}
 */
async function autoGenerateMonthlyFees(school_id, only_learner_id = null) {
  const now       = new Date()
  const thisYear  = now.getFullYear()
  const thisMonth = now.getMonth() + 1 // 1-based

  // ── Get active monthly fee plans for this year ────────────
  const { data: plans, error: planErr } = await supabase
    .from('fee_plans')
    .select('*, grades(id)')
    .eq('school_id', school_id)
    .eq('frequency', 'monthly')
    .eq('year', thisYear)
    .eq('is_active', true)

  if (planErr) throw planErr
  if (!plans || plans.length === 0) return { created: 0, skipped: 0 }

  // ── Get active learners ───────────────────────────────────
  let learnerQuery = supabase
    .from('learners')
    .select('id, class_id, classes(grade_id)')
    .eq('school_id', school_id)
    .eq('is_active', true)

  if (only_learner_id) {
    learnerQuery = learnerQuery.eq('id', only_learner_id)
  }

  const { data: learners, error: lErr } = await learnerQuery
  if (lErr) throw lErr
  if (!learners || learners.length === 0) return { created: 0, skipped: 0 }

  // ── Get ALL existing entries for this year ────────────────
  // Deduplicate by YEAR-MONTH, not exact date, preventing double entries
  const { data: existing } = await supabase
    .from('fee_ledger')
    .select('learner_id, fee_plan_id, due_date')
    .eq('school_id', school_id)
    .gte('due_date', `${thisYear}-01-01`)
    .lte('due_date', `${thisYear}-12-31`)

  // Key = learner + plan + YYYY-MM (month-level dedup, ignores exact day)
  const existingKeys = new Set(
    (existing || []).map(e => `${e.learner_id}|${e.fee_plan_id}|${e.due_date.slice(0,7)}`)
  )

  // ── Build entries for every month from Jan → now ─────────
  const toInsert = []

  for (let month = 1; month <= thisMonth; month++) {
    const monthStr  = String(month).padStart(2, '0')
    const monthLabel = `${MONTH_LABELS[month - 1]} ${thisYear}`

    for (const plan of plans) {
      // Which learners does this plan apply to?
      const eligible = plan.grade_id
        ? learners.filter(l => l.classes?.grade_id === plan.grade_id)
        : learners

      if (!eligible.length) continue

      // Build the due date for this month
      const dueDay  = Math.min(plan.due_day || 1, 28)
      const dueDate = `${thisYear}-${monthStr}-${String(dueDay).padStart(2, '0')}`
      const status  = new Date(dueDate) < now ? 'overdue' : 'pending'

      for (const learner of eligible) {
        const key = `${learner.id}|${plan.id}|${thisYear}-${monthStr}`
        if (existingKeys.has(key)) continue  // already exists

        toInsert.push({
          school_id,
          learner_id:  learner.id,
          fee_plan_id: plan.id,
          description: `${plan.name} — ${monthLabel}`,
          due_date:    dueDate,
          amount_due:  plan.amount,
          amount_paid: 0,
          status,
        })

        // Track in-run to prevent same-month duplicates even across plans
        existingKeys.add(key)
      }
    }
  }

  if (toInsert.length === 0) return { created: 0, skipped: 0 }

  // ── Insert in batches of 50 ───────────────────────────────
  let created = 0
  const BATCH = 50
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH)
    const { data: inserted, error: insErr } = await supabase
      .from('fee_ledger')
      .insert(batch)
      .select('id')
    if (insErr) throw insErr
    created += (inserted || []).length
  }

  return { created, skipped: 0 }
}

module.exports = { autoGenerateMonthlyFees }
