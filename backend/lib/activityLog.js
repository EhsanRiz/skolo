const supabase = require('./supabase')

/**
 * Log a platform activity event (fire-and-forget).
 * @param {object} opts
 * @param {string} opts.school_id
 * @param {string} opts.user_id
 * @param {string} opts.action  - e.g. 'learner_created', 'fee_paid', 'attendance_saved'
 * @param {string} [opts.entity_type] - e.g. 'learner', 'fee_ledger'
 * @param {string} [opts.entity_id]
 * @param {object} [opts.metadata] - extra context
 */
function logActivity({ school_id, user_id, action, entity_type, entity_id, metadata }) {
  supabase
    .from('activity_logs')
    .insert({ school_id, user_id, action, entity_type, entity_id, metadata: metadata || {} })
    .then(() => {})
    .catch(err => console.error('Activity log error:', err.message))
}

module.exports = { logActivity }
