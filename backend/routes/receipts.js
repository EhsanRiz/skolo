const express  = require('express')
const PDFDoc   = require('pdfkit')
const supabase = require('../lib/supabase')
const auth     = require('../middleware/auth')

const router = express.Router()
router.use(auth)

// ── GET /receipts/:ledger_id ──────────────────────────────────
// Generates and streams a PDF receipt for a fee ledger entry
router.get('/:ledger_id', async (req, res) => {
  try {
    // Fetch ledger entry with all relations
    const { data: entry, error } = await supabase
      .from('fee_ledger')
      .select(`
        *,
        learners (
          first_name, last_name, reference_no,
          classes ( name, grades ( name ) )
        ),
        fee_plans ( name, frequency ),
        schools (
          name, phone, email, logo_url,
          countries ( currency_symbol, currency_code )
        )
      `)
      .eq('id', req.params.ledger_id)
      .eq('school_id', req.user.school_id)
      .single()

    if (error || !entry) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    const school   = entry.schools
    const learner  = entry.learners
    const sym      = school?.countries?.currency_symbol || 'R'
    const amtDue   = Number(entry.amount_due)
    const amtPaid  = Number(entry.amount_paid)
    const balance  = amtDue - amtPaid
    const isPaid   = amtPaid >= amtDue

    // Receipt number: REC-{year}-{short id}
    const receiptNo = `REC-${new Date().getFullYear()}-${entry.id.slice(-6).toUpperCase()}`
    const paidDate  = entry.updated_at
      ? new Date(entry.updated_at).toLocaleDateString('en-ZA', { day:'numeric', month:'long', year:'numeric' })
      : new Date().toLocaleDateString('en-ZA', { day:'numeric', month:'long', year:'numeric' })

    // ── Build PDF ─────────────────────────────────────────────
    const doc = new PDFDoc({ size: 'A5', margin: 40 })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="Receipt-${receiptNo}.pdf"`)
    doc.pipe(res)

    const W = doc.page.width - 80  // usable width
    const navy = '#0f2044'
    const grey = '#64748b'
    const green = '#15803d'
    const red   = '#dc2626'

    // ── Header band ───────────────────────────────────────────
    doc.rect(40, 40, W, 70).fill(navy)

    doc.fillColor('#fff')
       .fontSize(20).font('Helvetica-Bold')
       .text('Skolo', 56, 52)

    doc.fontSize(8).font('Helvetica')
       .text('One platform. Whole school.', 56, 76)

    doc.fontSize(9).font('Helvetica-Bold')
       .text('PAYMENT RECEIPT', 0, 60, { align: 'right', width: doc.page.width - 56 })

    doc.fillColor(grey)
       .fontSize(8).font('Helvetica')
       .text(receiptNo, 0, 74, { align: 'right', width: doc.page.width - 56 })

    // ── School name ───────────────────────────────────────────
    doc.fillColor(navy).fontSize(13).font('Helvetica-Bold')
       .text(school?.name || 'School', 40, 126)

    if (school?.phone || school?.email) {
      doc.fillColor(grey).fontSize(8).font('Helvetica')
         .text([school?.phone, school?.email].filter(Boolean).join('  ·  '), 40, 142)
    }

    // ── Divider ───────────────────────────────────────────────
    doc.moveTo(40, 158).lineTo(40 + W, 158).strokeColor('#e2e8f0').lineWidth(1).stroke()

    // ── Receipt info ──────────────────────────────────────────
    const infoY = 168
    const col2  = 40 + W / 2

    const field = (label, value, x, y, valueColor) => {
      doc.fillColor(grey).fontSize(7).font('Helvetica-Bold')
         .text(label.toUpperCase(), x, y)
      doc.fillColor(valueColor || '#0f172a').fontSize(9).font('Helvetica')
         .text(value || '—', x, y + 11)
    }

    field('Learner name',    `${learner?.first_name} ${learner?.last_name}`, 40, infoY)
    field('Reference no.',   learner?.reference_no || '—',                   col2, infoY)
    field('Grade / Class',   `${learner?.classes?.grades?.name || ''} ${learner?.classes?.name || ''}`.trim() || '—', 40, infoY + 36)
    field('Date',            paidDate,                                        col2, infoY + 36)

    // ── Description box ───────────────────────────────────────
    const descY = infoY + 80
    doc.rect(40, descY, W, 32).fill('#f8fafc')
    doc.fillColor(navy).fontSize(10).font('Helvetica-Bold')
       .text(entry.description, 52, descY + 10, { width: W - 24 })

    // ── Amounts table ─────────────────────────────────────────
    const tableY = descY + 48
    const rows = [
      { label: 'Amount due',   value: `${sym}${amtDue.toLocaleString('en-ZA', {minimumFractionDigits:2})}`,  bold: false },
      { label: 'Amount paid',  value: `${sym}${amtPaid.toLocaleString('en-ZA', {minimumFractionDigits:2})}`, bold: true,  color: green },
      { label: 'Balance',      value: `${sym}${balance.toLocaleString('en-ZA', {minimumFractionDigits:2})}`, bold: true,  color: balance > 0 ? red : green },
    ]

    rows.forEach((r, i) => {
      const rowY = tableY + i * 24
      if (i % 2 === 1) doc.rect(40, rowY, W, 24).fill('#f8fafc')
      doc.fillColor(grey).fontSize(8).font('Helvetica').text(r.label, 52, rowY + 7)
      doc.fillColor(r.color || '#0f172a')
         .fontSize(10).font(r.bold ? 'Helvetica-Bold' : 'Helvetica')
         .text(r.value, 0, rowY + 7, { align: 'right', width: doc.page.width - 56 })
    })

    doc.moveTo(40, tableY + rows.length * 24)
       .lineTo(40 + W, tableY + rows.length * 24)
       .strokeColor('#e2e8f0').lineWidth(1).stroke()

    // ── Payment method ────────────────────────────────────────
    const methodY = tableY + rows.length * 24 + 14
    const methodLabels = {
      cash: 'Cash', eft: 'EFT / Bank Transfer',
      mobile_money: 'Mobile Money (M-Pesa)',
      ewallet: 'eWallet', snapscan: 'SnapScan', other: 'Other'
    }
    field('Payment method', methodLabels[entry.notes?.includes('method:') ? '' : 'cash'] || 'Cash', 40, methodY)

    // ── PAID IN FULL stamp ────────────────────────────────────
    if (isPaid) {
      doc.save()
      doc.rotate(-20, { origin: [40 + W / 2, methodY + 20] })
      doc.rect(40 + W / 2 - 65, methodY - 10, 130, 36)
         .strokeColor(green).lineWidth(2).stroke()
      doc.fillColor(green).fontSize(16).font('Helvetica-Bold')
         .text('PAID IN FULL', 40 + W / 2 - 60, methodY + 2)
      doc.restore()
    } else if (balance > 0) {
      doc.save()
      doc.rotate(-20, { origin: [40 + W / 2, methodY + 20] })
      doc.rect(40 + W / 2 - 60, methodY - 10, 120, 36)
         .strokeColor(red).lineWidth(2).stroke()
      doc.fillColor(red).fontSize(13).font('Helvetica-Bold')
         .text(`BALANCE: ${sym}${balance.toFixed(2)}`, 40 + W / 2 - 55, methodY + 2)
      doc.restore()
    }

    // ── Footer ────────────────────────────────────────────────
    const footerY = doc.page.height - 60
    doc.moveTo(40, footerY).lineTo(40 + W, footerY).strokeColor('#e2e8f0').lineWidth(1).stroke()
    doc.fillColor(grey).fontSize(7).font('Helvetica')
       .text(`Generated by Skolo · ${school?.name} · ${new Date().toLocaleDateString('en-ZA')}`,
             40, footerY + 8, { align: 'center', width: W })
    doc.text('This is an official payment receipt. Please retain for your records.',
             40, footerY + 20, { align: 'center', width: W })

    doc.end()
  } catch (err) {
    console.error('Receipt error:', err)
    if (!res.headersSent) res.status(500).json({ error: err.message })
  }
})

module.exports = router
