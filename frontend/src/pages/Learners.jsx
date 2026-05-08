import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { IconEye, IconEdit, IconTrash, ActionBtn, t } from '../components/ui'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import api from '../lib/api'

const phonePlaceholder = c => c === 'ZA' ? '082 000 0000' : 'XXXX XXXX'
const phoneMaxLen      = c => c === 'ZA' ? 10 : 8
const emptyL = { first_name: '', last_name: '', date_of_birth: '', gender: '', class_id: '' }
const emptyG = { first_name: '', last_name: '', phone: '', email: '', relationship: 'mother' }

// Download a blank import template
function downloadTemplate() {
  const headers = [['first_name','last_name','date_of_birth','gender','guardian_first_name','guardian_last_name','guardian_phone','guardian_email','guardian_relationship']]
  const example = [['Sarah','Mokoena','2015-03-12','female','Anna','Mokoena','58001234','anna@email.com','mother']]
  const ws = XLSX.utils.aoa_to_sheet([...headers, ...example])
  ws['!cols'] = headers[0].map(() => ({ wch: 22 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Learners')
  XLSX.writeFile(wb, 'Skolo_Learner_Import_Template.xlsx')
}

// Parse uploaded file into row objects
async function parseFile(file) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: r => resolve(r.data),
        error: reject
      })
    } else {
      const reader = new FileReader()
      reader.onload = e => {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        resolve(XLSX.utils.sheet_to_json(ws, { defval: '' }))
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    }
  })
}

function PortalLinkBox({ learnerId, guardians }) {
  const [portalUrl, setPortalUrl] = useState(null)
  const [generating, setGenerating] = useState(false)
  const api_ = api

  const generate = async () => {
    setGenerating(true)
    try {
      const primary = guardians?.find(lg => lg.is_primary)?.guardians
      if (!primary?.id) { alert('No primary guardian found'); return }
      const { data } = await api_.post('/portal/generate', { guardian_id: primary.id })
      const baseUrl = window.location.origin
      setPortalUrl(`${baseUrl}/parent/${data.token}`)
    } catch (err) { alert('Failed to generate portal link') }
    finally { setGenerating(false) }
  }

  const copy = () => {
    navigator.clipboard.writeText(portalUrl)
  }

  if (!portalUrl) {
    return (
      <button onClick={generate} disabled={generating}
        style={{ ...t.btn.ghost, width:'100%', justifyContent:'center', display:'flex', gap:8, alignItems:'center' }}>
        🔗 {generating ? 'Generating…' : 'Generate parent portal link'}
      </button>
    )
  }

  return (
    <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:9, padding:'10px 14px' }}>
      <div style={{ fontSize:12, fontWeight:600, color:'#15803d', marginBottom:6 }}>Portal link ready — share with parent:</div>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <input value={portalUrl} readOnly
          style={{ flex:1, padding:'7px 10px', border:'1px solid #86efac', borderRadius:7, fontSize:11, background:'#fff', color:'#374151', outline:'none' }} />
        <button onClick={copy}
          style={{ padding:'7px 14px', background:'#15803d', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
          Copy
        </button>
      </div>
    </div>
  )
}

export default function Learners() {
  const { school, user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const isReadOnly = user?.role === 'principal'
  const cc = school?.countries?.code || 'LS'

  const [learners, setLearners] = useState([])
  const [grades,   setGrades]   = useState([])
  const [search,   setSearch]   = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [modal,    setModal]    = useState(null)
  const [selected, setSelected] = useState(null)
  const [form,     setForm]     = useState(emptyL)
  const [guardian, setGuardian] = useState(emptyG)
  const [saving,   setSaving]   = useState(false)

  // Import state
  const [showImport,   setShowImport]   = useState(false)
  const [importRows,   setImportRows]   = useState([])
  const [importLoading, setImportLoading] = useState(false)
  const [importResult,  setImportResult]  = useState(null)
  const fileRef = useRef()

  const load = () => {
    api.get('/learners').then(r => setLearners(r.data)).catch(() => {})
    api.get('/grades').then(r => setGrades(r.data)).catch(() => {})
  }
  useEffect(() => { load() }, [])

  // Derive which grade a learner belongs to
  const gradeForLearner = l => {
    for (const g of grades) {
      if ((g.classes || []).some(c => c.id === l.class_id)) return g.id
      if (g.id === l.class_id) return g.id
    }
    return null
  }

  // Classes available for the selected grade filter
  const filteredClasses = gradeFilter ? (grades.find(g => g.id === gradeFilter)?.classes || []) : []

  const filtered = learners.filter(l => {
    if (search && !`${l.first_name} ${l.last_name}`.toLowerCase().includes(search.toLowerCase())) return false
    if (gradeFilter && gradeForLearner(l) !== gradeFilter) return false
    if (classFilter && l.class_id !== classFilter) return false
    return true
  })

  const hf = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const hg = e => setGuardian(g => ({ ...g, [e.target.name]: e.target.value }))

  const openAdd  = () => { setForm(emptyL); setGuardian(emptyG); setModal('add') }
  const openView = l => { setSelected(l); setModal('view') }
  const openEdit = l => {
    setSelected(l)
    setForm({ first_name: l.first_name, last_name: l.last_name, date_of_birth: l.date_of_birth || '', gender: l.gender || '', class_id: l.class_id || '', medical_condition: l.medical_condition || '', doctor_name: l.doctor_name || '', doctor_phone: l.doctor_phone || '' })
    const g = l.learner_guardians?.find(lg => lg.is_primary)?.guardians
    if (g) setGuardian({ first_name: g.first_name, last_name: g.last_name, phone: g.phone, email: g.email || '', relationship: g.relationship || 'mother' })
    setModal('edit')
  }
  const close = () => { setModal(null); setSelected(null) }

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/learners', { learner: form, guardian })
      toast.success('Learner added successfully')
      close(); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save') }
    finally { setSaving(false) }
  }

  const update = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await api.patch(`/learners/${selected.id}`, form)
      toast.success('Learner updated')
      close(); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update') }
    finally { setSaving(false) }
  }

  const remove = async id => {
    if (!confirm('Remove this learner? Records will be preserved.')) return
    try {
      await api.delete(`/learners/${id}`)
      toast.success('Learner removed')
      load()
    } catch (err) { toast.error('Failed to remove') }
  }

  // ── IMPORT ──────────────────────────────────────────────────
  const handleFileSelect = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const rows = await parseFile(file)
      setImportRows(rows)
      setImportResult(null)
    } catch { toast.error('Could not read file. Use CSV or Excel (.xlsx)') }
    e.target.value = ''
  }

  const runImport = async () => {
    if (!importRows.length) return
    setImportLoading(true)
    try {
      const { data } = await api.post('/learners/bulk', { rows: importRows })
      setImportResult(data)
      if (data.imported > 0) {
        toast.success(`${data.imported} learner${data.imported > 1 ? 's' : ''} imported successfully`)
        load()
      }
      if (data.skipped > 0) toast.warning(`${data.skipped} row${data.skipped > 1 ? 's' : ''} skipped — see details below`)
    } catch (err) { toast.error(err.response?.data?.error || 'Import failed') }
    finally { setImportLoading(false) }
  }

  const closeImport = () => { setShowImport(false); setImportRows([]); setImportResult(null) }

  // Grade/class helpers
  const getClassName = l => {
    if (!l.class_id) return '—'
    for (const g of grades) {
      const c = (g.classes || []).find(c => c.id === l.class_id)
      if (c) return `${g.name} ${c.name}`
      if (g.id === l.class_id) return g.name
    }
    return '—'
  }

  const GradeSelect = () => {
    const hasClasses = grades.some(g => (g.classes || []).length > 0)
    if (hasClasses) return (
      <><label style={t.label}>Grade / Class</label>
        <select style={t.input} name="class_id" value={form.class_id} onChange={hf}>
          <option value="">Select class…</option>
          {grades.map(g => (
            <optgroup key={g.id} label={g.name}>
              {(g.classes || []).map(c => <option key={c.id} value={c.id}>{g.name}{c.name}</option>)}
            </optgroup>
          ))}
        </select></>
    )
    if (grades.length > 0) return (
      <><label style={t.label}>Grade</label>
        <select style={t.input} name="class_id" value={form.class_id} onChange={hf}>
          <option value="">Select grade…</option>
          {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select></>
    )
    return (
      <><label style={t.label}>Grade / Class</label>
        <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 14, padding: '9px 13px', background: '#fafafa', borderRadius: 9 }}>
          No grades yet — go to Settings → Grades & Classes
        </div></>
    )
  }

  const Field = ({ label, value }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, color: '#1f2937', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )

  const PREVIEW_COLS = ['first_name','last_name','guardian_phone','gender']

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1f2937', letterSpacing: '-0.3px' }}>Learners</h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>{learners.length} active learner{learners.length !== 1 ? 's' : ''}</p>
        </div>
        {!isReadOnly && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={t.btn.ghost} onClick={() => setShowImport(true)}>⬆ Import</button>
            <button style={t.btn.primary} onClick={openAdd}>+ Add learner</button>
          </div>
        )}
      </div>

      {/* Search + Filters */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <input style={{ ...t.input, marginBottom: 0, background: '#fafafa' }}
          placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} />

        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={gradeFilter}
            onChange={e => { setGradeFilter(e.target.value); setClassFilter('') }}
            style={{ padding: '7px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', background: gradeFilter ? '#e6eff5' : '#fff', color: gradeFilter ? '#003049' : '#374151', fontWeight: gradeFilter ? 600 : 400, minWidth: 140 }}
          >
            <option value="">All grades</option>
            {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>

          {filteredClasses.length > 0 && (
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              style={{ padding: '7px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', background: classFilter ? '#e6eff5' : '#fff', color: classFilter ? '#003049' : '#374151', fontWeight: classFilter ? 600 : 400, minWidth: 120 }}
            >
              <option value="">All classes</option>
              {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {(gradeFilter || classFilter) && (
            <button onClick={() => { setGradeFilter(''); setClassFilter('') }}
              style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 7, background: '#fff', color: '#9ca3af', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Clear filters
            </button>
          )}

          <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, marginLeft: 'auto' }}>
            {filtered.length} learner{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={t.th}>Ref No</th>
              <th style={t.th}>Name</th>
              <th style={t.th}>Grade / Class</th>
              <th style={t.th}>Guardian</th>
              <th style={t.th}>Phone</th>
              <th style={{ ...t.th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => {
              const primary = l.learner_guardians?.find(lg => lg.is_primary)?.guardians
              return (
                <tr key={l.id}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ ...t.td, fontSize:12, color:'#9ca3af', fontWeight:600, letterSpacing:'0.5px' }}>{l.reference_no||'—'}</td>
                  <td style={{ ...t.td, fontWeight: 600, color: '#1f2937' }}>{l.first_name} {l.last_name}</td>
                  <td style={t.td}>{getClassName(l)}</td>
                  <td style={t.td}>{primary ? `${primary.first_name} ${primary.last_name}` : '—'}</td>
                  <td style={t.td}>{primary?.phone || '—'}</td>
                  <td style={{ ...t.td, textAlign: 'right' }}>
                    <ActionBtn onClick={() => navigate(`/learners/${l.id}`)} title="View profile"><IconEye /></ActionBtn>
                    {!isReadOnly && <ActionBtn onClick={() => openEdit(l)} title="Edit"><IconEdit /></ActionBtn>}
                    {!isReadOnly && <ActionBtn onClick={() => remove(l.id)} title="Remove" variant="danger"><IconTrash /></ActionBtn>}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ ...t.td, color: '#9ca3af', textAlign: 'center', padding: 40 }}>
                No learners found.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── IMPORT MODAL ── */}
      {showImport && (
        <div style={t.overlay} onClick={e => e.target === e.currentTarget && closeImport()}>
          <div style={{ ...t.modal, maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 19, fontWeight: 800 }}>Import learners</h2>
              <button onClick={closeImport} style={{ background: '#f7f7f7', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            {/* Step 1 — template */}
            <div style={{ background: '#fafafa', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Step 1 — Download the template</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>
                Fill in learner and guardian details. Required columns: <code style={{ background: '#e5e7eb', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>first_name</code> <code style={{ background: '#e5e7eb', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>last_name</code> <code style={{ background: '#e5e7eb', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>guardian_phone</code>
              </div>
              <button onClick={downloadTemplate} style={{ ...t.btn.ghost, fontSize: 13, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                ⬇ Download Excel template
              </button>
            </div>

            {/* Step 2 — upload */}
            <div style={{ background: '#fafafa', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Step 2 — Upload your file</div>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} style={{ display: 'none' }} />
              <button onClick={() => fileRef.current?.click()} style={{ ...t.btn.ghost, fontSize: 13, padding: '7px 14px' }}>
                Choose CSV or Excel file…
              </button>
              {importRows.length > 0 && (
                <span style={{ marginLeft: 12, fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
                  ✓ {importRows.length} row{importRows.length > 1 ? 's' : ''} loaded
                </span>
              )}
            </div>

            {/* Preview */}
            {importRows.length > 0 && !importResult && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                  Preview — first {Math.min(5, importRows.length)} of {importRows.length} rows
                </div>
                <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        {PREVIEW_COLS.map(c => <th key={c} style={{ ...t.th, fontSize: 11 }}>{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          {PREVIEW_COLS.map(c => <td key={c} style={{ ...t.td, padding: '8px 12px' }}>{row[c] || '—'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Result */}
            {importResult && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '14px 16px', marginBottom: importResult.errors.length ? 10 : 0 }}>
                  <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 4 }}>Import complete</div>
                  <div style={{ fontSize: 13, color: '#14532d' }}>
                    ✓ {importResult.imported} imported · {importResult.skipped} skipped
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '14px 16px', maxHeight: 140, overflowY: 'auto' }}>
                    <div style={{ fontWeight: 700, color: '#b8870a', marginBottom: 6, fontSize: 13 }}>Skipped rows</div>
                    {importResult.errors.map((e, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#7f1d1d', marginBottom: 3 }}>• {e}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={t.btn.ghost} onClick={closeImport}>
                {importResult ? 'Close' : 'Cancel'}
              </button>
              {!importResult && (
                <button style={t.btn.primary} disabled={!importRows.length || importLoading} onClick={runImport}>
                  {importLoading ? 'Importing…' : `Import ${importRows.length} learners`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {modal === 'add' && (
        <div style={t.overlay} onClick={e => e.target === e.currentTarget && close()}>
          <div style={t.modal}>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 20 }}>Add learner</h2>
            <form onSubmit={save}>
              <div style={t.sectionLabel}>Learner details</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                <div><label style={t.label}>First name *</label><input style={t.input} name="first_name" value={form.first_name} onChange={hf} required /></div>
                <div><label style={t.label}>Last name *</label><input style={t.input} name="last_name" value={form.last_name} onChange={hf} required /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                <div><label style={t.label}>Date of birth</label><input style={t.input} name="date_of_birth" type="date" value={form.date_of_birth} onChange={hf} /></div>
                <div><label style={t.label}>Gender</label>
                  <select style={t.input} name="gender" value={form.gender} onChange={hf}>
                    <option value="">Select…</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select></div>
              </div>
              <GradeSelect />
              <div style={t.sectionLabel}>Parent / Guardian</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                <div><label style={t.label}>First name *</label><input style={t.input} name="first_name" value={guardian.first_name} onChange={hg} required /></div>
                <div><label style={t.label}>Last name *</label><input style={t.input} name="last_name" value={guardian.last_name} onChange={hg} required /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                <div>
                  <label style={t.label}>Phone * ({phonePlaceholder(cc)})</label>
                  <input style={t.input} name="phone" value={guardian.phone} onChange={hg} placeholder={phonePlaceholder(cc)} maxLength={phoneMaxLen(cc)} required />
                </div>
                <div><label style={t.label}>Relationship</label>
                  <select style={t.input} name="relationship" value={guardian.relationship} onChange={hg}>
                    <option value="mother">Mother</option><option value="father">Father</option><option value="guardian">Guardian</option>
                  </select></div>
              </div>
              <label style={t.label}>Email</label>
              <input style={t.input} name="email" type="email" value={guardian.email} onChange={hg} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" style={t.btn.ghost} onClick={close}>Cancel</button>
                <button type="submit" style={t.btn.primary} disabled={saving}>{saving ? 'Saving…' : 'Save learner'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {modal === 'view' && selected && (
        <div style={t.overlay} onClick={e => e.target === e.currentTarget && close()}>
          <div style={t.modal}>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 20 }}>{selected.first_name} {selected.last_name}</h2>
            <div style={t.sectionLabel}>Learner details</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
              <Field label="Date of birth" value={selected.date_of_birth ? new Date(selected.date_of_birth).toLocaleDateString('en-ZA') : null} />
              <Field label="Gender" value={selected.gender} />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:8}}>
              <Field label="Reference No" value={selected.reference_no} />
              <Field label="Grade / Class" value={getClassName(selected)} />
            </div>
            <div style={{ borderTop: '1px solid #f7f7f7', margin: '16px 0' }} />
            <div style={t.sectionLabel}>Parent / Guardian</div>
            {selected.learner_guardians?.map(lg => {
              const g = lg.guardians
              return (
                <div key={g.id}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
                    <Field label="Name" value={`${g.first_name} ${g.last_name}`} />
                    <Field label="Relationship" value={g.relationship} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
                    <Field label="Phone" value={g.phone} />
                    <Field label="Email" value={g.email} />
                  </div>
                </div>
              )
            })}
            <div style={{ borderTop:'1px solid #f7f7f7', margin:'16px 0' }} />
            <div style={{ fontSize:12, color:'#6b7280', marginBottom:12 }}>
              <strong style={{color:'#374151'}}>Parent portal link</strong> — send this to the guardian so they can view their child's fee balance without logging in.
            </div>
            <PortalLinkBox learnerId={selected.id} guardians={selected.learner_guardians} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button style={t.btn.ghost} onClick={close}>Close</button>
              <button style={t.btn.primary} onClick={() => openEdit(selected)}>Edit →</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {modal === 'edit' && selected && (
        <div style={t.overlay} onClick={e => e.target === e.currentTarget && close()}>
          <div style={t.modal}>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 20 }}>Edit — {selected.first_name} {selected.last_name}</h2>
            <form onSubmit={update}>
              <div style={t.sectionLabel}>Learner details</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                <div><label style={t.label}>First name *</label><input style={t.input} name="first_name" value={form.first_name} onChange={hf} required /></div>
                <div><label style={t.label}>Last name *</label><input style={t.input} name="last_name" value={form.last_name} onChange={hf} required /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                <div><label style={t.label}>Date of birth</label><input style={t.input} name="date_of_birth" type="date" value={form.date_of_birth} onChange={hf} /></div>
                <div><label style={t.label}>Gender</label>
                  <select style={t.input} name="gender" value={form.gender} onChange={hf}>
                    <option value="">Select…</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select></div>
              </div>
              <GradeSelect />
              {/* Medical — optional */}
              <div style={{ borderTop:'1px solid #f7f7f7', paddingTop:14, marginTop:4 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:12 }}>
                  Medical <span style={{ fontWeight:400, textTransform:'none' }}>(optional · with parent consent)</span>
                </div>
                <div><label style={t.label}>Medical condition</label>
                  <input style={t.input} value={form.medical_condition||''} onChange={e=>setForm(f=>({...f,medical_condition:e.target.value}))} placeholder="e.g. Asthma, Diabetes, Epilepsy" /></div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:12 }}>
                  <div><label style={t.label}>Doctor / clinic</label>
                    <input style={t.input} value={form.doctor_name||''} onChange={e=>setForm(f=>({...f,doctor_name:e.target.value}))} placeholder="Dr. Name or clinic name" /></div>
                  <div><label style={t.label}>Doctor phone</label>
                    <input style={t.input} value={form.doctor_phone||''} onChange={e=>setForm(f=>({...f,doctor_phone:e.target.value}))} placeholder="XXXX XXXX" /></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" style={t.btn.ghost} onClick={close}>Cancel</button>
                <button type="submit" style={t.btn.primary} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
