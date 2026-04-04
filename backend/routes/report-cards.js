const express = require('express')
const PDFDoc = require('pdfkit')
const supabase = require('../lib/supabase')
const auth = require('../middleware/auth')

const router = express.Router()
router.use(auth)

// ─── Helper: Get term date range ──────────────────────────────
const getTermDateRange = (term, year) => {
  const ranges = {
    1: { start: new Date(year, 0, 1), end: new Date(year, 2, 31) },     // Jan-Mar
    2: { start: new Date(year, 3, 1), end: new Date(year, 5, 30) },     // Apr-Jun
    3: { start: new Date(year, 6, 1), end: new Date(year, 8, 30) },     // Jul-Sep
    4: { start: new Date(year, 9, 1), end: new Date(year, 11, 31) }     // Oct-Dec
  }
  return ranges[term] || null
}

// ─── Helper: Get grade from mark using school boundaries ────────
const getGradeForMark = (mark, gradeBoundaries) => {
  if (!gradeBoundaries || !Array.isArray(gradeBoundaries) || gradeBoundaries.length === 0) {
    // Default scale: A≥80, B≥70, C≥60, D≥50, F<50
    if (mark >= 80) return 'A'
    if (mark >= 70) return 'B'
    if (mark >= 60) return 'C'
    if (mark >= 50) return 'D'
    return 'F'
  }

  // Boundaries are [{grade: 'A', min: 80}, {grade: 'B', min: 70}, ...]
  // Already sorted descending by min, so first match wins
  for (const boundary of gradeBoundaries) {
    if (mark >= boundary.min) {
      return boundary.grade
    }
  }
  return 'F'
}

// ─── Helper: Calculate attendance summary ─────────────────────
const calculateAttendanceSummary = async (learnerId, term, year) => {
  const range = getTermDateRange(term, year)
  if (!range) return null

  const { data: attendance, error } = await supabase
    .from('attendance')
    .select('status')
    .eq('learner_id', learnerId)
    .gte('date', range.start.toISOString())
    .lte('date', range.end.toISOString())

  if (error) {
    console.error('Attendance fetch error:', error.message)
    return { total: 0, present: 0, absent: 0, late: 0, excused: 0, rate: 0 }
  }

  const records = attendance || []
  const total = records.length
  const present = records.filter(r => r.status === 'present').length
  const absent = records.filter(r => r.status === 'absent').length
  const late = records.filter(r => r.status === 'late').length
  const excused = records.filter(r => r.status === 'excused').length

  const attended = present + late  // late counts as attended
  const rate = total > 0 ? Math.round((attended / total) * 100) : 0

  return { total, present, absent, late, excused, rate }
}

// ─── Helper: Extract base64 from data URL ─────────────────────
const extractBase64FromDataURL = (dataUrl) => {
  if (!dataUrl) return null
  // Format: "data:image/png;base64,{base64String}"
  const match = dataUrl.match(/base64,(.+)$/)
  return match ? match[1] : null
}

// ─── GET /report-cards/:learner_id ────────────────────────────
router.get('/:learner_id', async (req, res) => {
  try {
    const { term, year } = req.query
    const learnerId = req.params.learner_id

    // Validate params
    if (!term || !year) {
      return res.status(400).json({ error: 'term and year query parameters required' })
    }
    const termNum = parseInt(term)
    const yearNum = parseInt(year)
    if (isNaN(termNum) || termNum < 1 || termNum > 4) {
      return res.status(400).json({ error: 'term must be 1-4' })
    }
    if (isNaN(yearNum)) {
      return res.status(400).json({ error: 'year must be a valid number' })
    }

    // Fetch learner with school and class info
    const { data: learner, error: learnerErr } = await supabase
      .from('learners')
      .select(`
        *,
        classes ( name, grades ( name ) ),
        schools (
          id, name, phone, email, address, logo_url, grade_boundaries,
          countries ( currency_symbol, currency_code )
        )
      `)
      .eq('id', learnerId)
      .eq('school_id', req.user.school_id)
      .single()

    if (learnerErr || !learner) {
      return res.status(404).json({ error: 'Learner not found' })
    }

    // Fetch exam results for this term and year
    const { data: examResults, error: examErr } = await supabase
      .from('exam_results')
      .select('subject, mark')
      .eq('learner_id', learnerId)
      .eq('term', termNum)
      .eq('year', yearNum)
      .eq('school_id', req.user.school_id)

    if (examErr) throw examErr

    // Fetch attendance summary
    const attendance = await calculateAttendanceSummary(learnerId, termNum, yearNum)

    // Prepare results data
    const results = (examResults || []).sort((a, b) => a.subject.localeCompare(b.subject))
    const school = learner.schools
    const gradeBoundaries = school?.grade_boundaries

    // Calculate average
    const marks = results.map(r => r.mark)
    const average = marks.length > 0 ? Math.round(marks.reduce((a, b) => a + b, 0) / marks.length) : 0

    // ── Build PDF ──────────────────────────────────────────────
    const doc = new PDFDoc({ size: 'A4', margin: 40 })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="report-card-${learner.first_name}-${learner.last_name}.pdf"`)
    doc.pipe(res)

    const W = doc.page.width - 80   // Usable width
    const navy = '#0f2044'
    const lightGrey = '#f1f5f9'
    const darkGrey = '#64748b'
    const green = '#15803d'
    const amber = '#ea580c'
    const red = '#dc2626'

    // ── School Logo & Header ───────────────────────────────────
    let logoY = 50
    if (school?.logo_url) {
      try {
        const base64 = extractBase64FromDataURL(school.logo_url)
        if (base64) {
          const logoBuffer = Buffer.from(base64, 'base64')
          doc.image(logoBuffer, 50, 50, { width: 60, height: 60 })
          logoY = 120
        }
      } catch (err) {
        console.error('Logo rendering error:', err.message)
      }
    }

    // School name and contact
    doc.fillColor(navy).fontSize(18).font('Helvetica-Bold')
       .text(school?.name || 'School', 120, 55)

    doc.fillColor(darkGrey).fontSize(9).font('Helvetica')
       .text([school?.address, school?.phone, school?.email].filter(Boolean).join('  ·  '), 120, 80)

    // ── Title Bar ──────────────────────────────────────────────
    const titleY = logoY + 10
    doc.rect(40, titleY, W, 40).fill(navy)

    doc.fillColor('#fff').fontSize(22).font('Helvetica-Bold')
       .text('REPORT CARD', 0, titleY + 8, { align: 'center', width: doc.page.width })

    doc.fillColor('#cff0fe').fontSize(11).font('Helvetica')
       .text(`Term ${termNum} · ${yearNum}`, 0, titleY + 28, { align: 'center', width: doc.page.width })

    // ── Learner Info Section ───────────────────────────────────
    let infoY = titleY + 50
    doc.moveTo(40, infoY).lineTo(40 + W, infoY).strokeColor('#e2e8f0').lineWidth(1).stroke()

    infoY += 15
    const col1 = 50
    const col2 = 50 + W / 2

    const infoField = (label, value, x, y) => {
      doc.fillColor(darkGrey).fontSize(8).font('Helvetica-Bold')
         .text(label.toUpperCase(), x, y)
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica')
         .text(value || '—', x, y + 11)
    }

    const dob = learner.date_of_birth
      ? new Date(learner.date_of_birth).toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' })
      : '—'

    infoField('Name', `${learner.first_name} ${learner.last_name}`, col1, infoY)
    infoField('Reference No', learner.reference_no, col2, infoY)

    infoY += 35
    infoField('Grade', learner.classes?.grades?.name || '—', col1, infoY)
    infoField('Class', learner.classes?.name || '—', col2, infoY)

    infoY += 35
    infoField('Date of Birth', dob, col1, infoY)
    infoField('Gender', learner.gender || '—', col2, infoY)

    // ── Grades Table ───────────────────────────────────────────
    infoY += 50
    doc.fillColor(navy).fontSize(12).font('Helvetica-Bold')
       .text('ACADEMIC RESULTS', 50, infoY)

    infoY += 22
    const tableX = 50
    const tableColWidths = [W * 0.6, W * 0.2, W * 0.2]
    const tableHeaderY = infoY
    const rowHeight = 18

    // Header row
    doc.rect(tableX, tableHeaderY, tableColWidths[0], rowHeight).fill(navy)
    doc.rect(tableX + tableColWidths[0], tableHeaderY, tableColWidths[1], rowHeight).fill(navy)
    doc.rect(tableX + tableColWidths[0] + tableColWidths[1], tableHeaderY, tableColWidths[2], rowHeight).fill(navy)

    doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold')
    doc.text('Subject', tableX + 5, tableHeaderY + 4, { width: tableColWidths[0] - 10 })
    doc.text('Mark (%)', tableX + tableColWidths[0] + 5, tableHeaderY + 4, { width: tableColWidths[1] - 10, align: 'center' })
    doc.text('Grade', tableX + tableColWidths[0] + tableColWidths[1] + 5, tableHeaderY + 4, { width: tableColWidths[2] - 10, align: 'center' })

    let rowY = tableHeaderY + rowHeight
    let rowNum = 0

    // Data rows
    results.forEach(result => {
      const rowColor = rowNum % 2 === 0 ? '#fff' : lightGrey
      doc.rect(tableX, rowY, W, rowHeight).fill(rowColor)

      const grade = getGradeForMark(result.mark, gradeBoundaries)

      doc.fillColor('#0f172a').fontSize(9).font('Helvetica')
      doc.text(result.subject, tableX + 5, rowY + 4, { width: tableColWidths[0] - 10 })
      doc.text(result.mark.toString(), tableX + tableColWidths[0] + 5, rowY + 4, { width: tableColWidths[1] - 10, align: 'center' })
      doc.text(grade, tableX + tableColWidths[0] + tableColWidths[1] + 5, rowY + 4, { width: tableColWidths[2] - 10, align: 'center' })

      rowY += rowHeight
      rowNum++
    })

    // Average row
    if (results.length > 0) {
      doc.rect(tableX, rowY, W, rowHeight).fill(navy)

      const avgGrade = getGradeForMark(average, gradeBoundaries)

      doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold')
      doc.text('AVERAGE', tableX + 5, rowY + 4, { width: tableColWidths[0] - 10 })
      doc.text(average.toString(), tableX + tableColWidths[0] + 5, rowY + 4, { width: tableColWidths[1] - 10, align: 'center' })
      doc.text(avgGrade, tableX + tableColWidths[0] + tableColWidths[1] + 5, rowY + 4, { width: tableColWidths[2] - 10, align: 'center' })
    }

    // ── Attendance Box ─────────────────────────────────────────
    rowY += rowHeight + 20
    const attendBoxX = tableX
    const attendBoxW = W / 2 - 5
    const attendBoxH = 90

    doc.rect(attendBoxX, rowY, attendBoxW, attendBoxH).stroke()
    doc.fillColor(navy).fontSize(11).font('Helvetica-Bold')
       .text('ATTENDANCE', attendBoxX + 8, rowY + 8)

    if (attendance) {
      let attendY = rowY + 28
      const attendCol1 = attendBoxX + 8
      const attendCol2 = attendBoxX + attendBoxW / 2

      doc.fillColor(darkGrey).fontSize(7).font('Helvetica-Bold').text('TOTAL DAYS', attendCol1, attendY)
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica').text(attendance.total.toString(), attendCol1, attendY + 10)

      doc.fillColor(darkGrey).fontSize(7).font('Helvetica-Bold').text('PRESENT', attendCol2, attendY)
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica').text(attendance.present.toString(), attendCol2, attendY + 10)

      attendY += 28
      doc.fillColor(darkGrey).fontSize(7).font('Helvetica-Bold').text('ABSENT', attendCol1, attendY)
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica').text(attendance.absent.toString(), attendCol1, attendY + 10)

      doc.fillColor(darkGrey).fontSize(7).font('Helvetica-Bold').text('LATE', attendCol2, attendY)
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica').text(attendance.late.toString(), attendCol2, attendY + 10)

      attendY += 28
      doc.fillColor(darkGrey).fontSize(7).font('Helvetica-Bold').text('EXCUSED', attendCol1, attendY)
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica').text(attendance.excused.toString(), attendCol1, attendY + 10)

      // Attendance rate with color
      const rateColor = attendance.rate >= 80 ? green : attendance.rate >= 70 ? amber : red
      doc.fillColor(darkGrey).fontSize(7).font('Helvetica-Bold').text('RATE', attendCol2, attendY)
      doc.fillColor(rateColor).fontSize(10).font('Helvetica-Bold').text(`${attendance.rate}%`, attendCol2, attendY + 10)
    }

    // ── Grade Scale Legend ─────────────────────────────────────
    const legendX = attendBoxX + attendBoxW + 10
    doc.rect(legendX, rowY, attendBoxW, attendBoxH).stroke()
    doc.fillColor(navy).fontSize(11).font('Helvetica-Bold')
       .text('GRADE SCALE', legendX + 8, rowY + 8)

    let legendY = rowY + 28
    if (gradeBoundaries && Array.isArray(gradeBoundaries) && gradeBoundaries.length > 0) {
      // Custom boundaries
      gradeBoundaries.forEach(boundary => {
        doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold')
           .text(boundary.grade, legendX + 8, legendY)
        doc.fillColor(darkGrey).fontSize(8).font('Helvetica')
           .text(`≥ ${boundary.min}`, legendX + 35, legendY)
        legendY += 16
      })
    } else {
      // Default scale
      const defaults = [
        { grade: 'A', min: 80 },
        { grade: 'B', min: 70 },
        { grade: 'C', min: 60 },
        { grade: 'D', min: 50 },
        { grade: 'F', min: 0 }
      ]
      defaults.forEach(d => {
        doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold')
           .text(d.grade, legendX + 8, legendY)
        doc.fillColor(darkGrey).fontSize(8).font('Helvetica')
           .text(`≥ ${d.min}`, legendX + 35, legendY)
        legendY += 16
      })
    }

    // ── Signature Lines ────────────────────────────────────────
    let sigY = rowY + attendBoxH + 30
    const sigX1 = tableX
    const sigX2 = tableX + W / 2 + 10

    // Class Teacher
    doc.moveTo(sigX1, sigY).lineTo(sigX1 + 90, sigY).strokeColor(darkGrey).lineWidth(1).stroke()
    doc.fillColor(darkGrey).fontSize(8).font('Helvetica')
       .text('Class Teacher', sigX1, sigY + 5)

    // Principal
    doc.moveTo(sigX2, sigY).lineTo(sigX2 + 90, sigY).strokeColor(darkGrey).lineWidth(1).stroke()
    doc.fillColor(darkGrey).fontSize(8).font('Helvetica')
       .text('Principal', sigX2, sigY + 5)

    // Date
    sigY += 25
    doc.moveTo(sigX1, sigY).lineTo(sigX1 + 90, sigY).strokeColor(darkGrey).lineWidth(1).stroke()
    doc.fillColor(darkGrey).fontSize(8).font('Helvetica')
       .text('Date', sigX1, sigY + 5)

    // ── Footer ─────────────────────────────────────────────────
    doc.fillColor(darkGrey).fontSize(7).font('Helvetica')
       .text('Generated by Skolo', 0, doc.page.height - 30, { align: 'center', width: doc.page.width })

    doc.end()
  } catch (err) {
    console.error('Report card generation error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
