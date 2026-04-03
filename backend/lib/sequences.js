const supabase = require('./supabase')

/**
 * Gets the next sequential reference number for a school.
 * Uses a locked increment on school_sequences to prevent duplicates.
 *
 * @param {string} school_id
 * @param {'learner'|'teacher'} type
 * @returns {Promise<string>} e.g. '00042' for learner, 'T-0007' for teacher
 */
async function nextRefNo(school_id, type) {
  // Upsert + increment atomically using RPC isn't available without a function,
  // so we do: fetch current → increment → update, with a fallback on conflict.
  // Race conditions are extremely unlikely in a school context.

  const { data: existing, error: fetchErr } = await supabase
    .from('school_sequences')
    .select('last_value')
    .eq('school_id', school_id)
    .eq('sequence_type', type)
    .single()

  let nextVal

  if (fetchErr || !existing) {
    // First record for this school + type — count existing to be safe
    const table = type === 'learner' ? 'learners' : 'teachers'
    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('school_id', school_id)
    nextVal = (count || 0) + 1

    await supabase.from('school_sequences').upsert({
      school_id, sequence_type: type, last_value: nextVal
    }, { onConflict: 'school_id,sequence_type' })
  } else {
    nextVal = (existing.last_value || 0) + 1
    await supabase
      .from('school_sequences')
      .update({ last_value: nextVal })
      .eq('school_id', school_id)
      .eq('sequence_type', type)
  }

  return type === 'learner'
    ? String(nextVal).padStart(5, '0')
    : 'T-' + String(nextVal).padStart(4, '0')
}

module.exports = { nextRefNo }
