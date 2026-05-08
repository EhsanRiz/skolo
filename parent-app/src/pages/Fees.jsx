import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

export default function Fees() {
  const { school } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [expanded, setExpanded] = useState({})

  const currency = school?.countries?.currency_symbol || 'R'

  useEffect(() => { loadFees() }, [year])

  async function loadFees() {
    setLoading(true)
    try {
      const { data: d } = await api.get(`/parent-data/fees?year=${year}`)
      setData(d)
    } catch {}
    setLoading(false)
  }

  function toggle(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading fees...</div>

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: 0 }}>Fees</h1>
        <select value={year} onChange={e => setYear(e.target.value)} style={{
          padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, color: '#374151'
        }}>
          {[2026, 2025, 2024].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {(data?.learners || []).map(child => {
        const balance = parseFloat(child.fee_summary?.balance || 0)
        const isOpen = expanded[child.id]

        return (
          <div key={child.id} style={cardStyle}>
            {/* Child header */}
            <div onClick={() => toggle(child.id)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#1f2937' }}>
                    {child.first_name} {child.last_name}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {child.classes?.grades?.name} {child.classes?.name}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontWeight: 700, fontSize: 16,
                    color: balance > 0 ? '#dc2626' : '#16a34a'
                  }}>
                    {currency}{child.fee_summary?.balance || '0.00'}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>balance</div>
                </div>
              </div>

              {/* Summary bar */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                <div style={{ background: '#fafafa', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Total Due</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{currency}{child.fee_summary?.total_due}</div>
                </div>
                <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Total Paid</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#16a34a' }}>{currency}{child.fee_summary?.total_paid}</div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: 8, color: '#9ca3af', fontSize: 11 }}>
                {isOpen ? 'Tap to collapse' : 'Tap to view details'}
              </div>
            </div>

            {/* Fee entries */}
            {isOpen && (
              <div style={{ marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                {(child.fees || []).length === 0 ? (
                  <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 16 }}>No fee entries for {year}</div>
                ) : (
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: '#6b7280', fontSize: 11, textAlign: 'left' }}>
                        <th style={{ padding: '6px 0', fontWeight: 500 }}>Description</th>
                        <th style={{ padding: '6px 0', fontWeight: 500 }}>Due</th>
                        <th style={{ padding: '6px 0', fontWeight: 500, textAlign: 'right' }}>Amount</th>
                        <th style={{ padding: '6px 0', fontWeight: 500, textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {child.fees.map(fee => (
                        <tr key={fee.id} style={{ borderTop: '1px solid #f7f7f7' }}>
                          <td style={{ padding: '8px 0', color: '#1f2937' }}>{fee.description}</td>
                          <td style={{ padding: '8px 0', color: '#6b7280', fontSize: 12 }}>
                            {new Date(fee.due_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                          </td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 500 }}>
                            {currency}{parseFloat(fee.amount_due).toFixed(2)}
                          </td>
                          <td style={{ padding: '8px 0', textAlign: 'right' }}>
                            <StatusBadge status={computeStatus(fee)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )
      })}

      {(!data?.learners || data.learners.length === 0) && (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40, fontSize: 14 }}>
          No learners linked to your account
        </div>
      )}
    </div>
  )
}

function computeStatus(fee) {
  const paid = parseFloat(fee.amount_paid || 0)
  const due = parseFloat(fee.amount_due || 0)
  if (paid >= due) return 'paid'
  if (fee.status === 'waived') return 'waived'
  if (new Date(fee.due_date) < new Date() && paid < due) return 'overdue'
  if (paid > 0) return 'partial'
  return 'pending'
}

function StatusBadge({ status }) {
  const styles = {
    paid: { bg: '#dcfce7', color: '#15803d', label: 'Paid' },
    partial: { bg: '#fef4d6', color: '#b8870a', label: 'Partial' },
    overdue: { bg: '#fee2e2', color: '#dc2626', label: 'Overdue' },
    pending: { bg: '#f7f7f7', color: '#6b7280', label: 'Pending' },
    waived: { bg: '#ede9fe', color: '#7c3aed', label: 'Waived' }
  }
  const s = styles[status] || styles.pending
  return (
    <span style={{
      padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color
    }}>
      {s.label}
    </span>
  )
}

const cardStyle = {
  background: '#fff', borderRadius: 12, padding: 16,
  border: '1px solid #e5e7eb', marginBottom: 12
}
