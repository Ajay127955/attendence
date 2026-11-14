'use strict';

const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { Attendance, Student } = require('../models');
const ApiError = require('../utils/ApiError');
const { toDateOnly, toDateKey } = require('../utils/dates');
const { getSettings } = require('./settings.service');
const { computePercentage } = require('./attendanceStats.service');
const { toCSV } = require('../utils/csv');
const { teacherClassIds } = require('./access.service');

/** Builds the Mongo match object from report filters, applying role scoping. */
async function buildMatch(filters, user) {
  const match = {};
  if (filters.from || filters.to) {
    match.date = {};
    if (filters.from) match.date.$gte = toDateOnly(filters.from);
    if (filters.to) match.date.$lte = toDateOnly(filters.to);
  }
  if (filters.classId) match.class = filters.classId;
  if (filters.subjectId) match.subject = filters.subjectId;
  if (filters.studentId) match.student = filters.studentId;
  if (filters.status) match.status = filters.status;

  if (user.role === 'teacher') {
    const ids = await teacherClassIds(user._id);
    if (filters.classId && !ids.includes(String(filters.classId))) {
      throw ApiError.forbidden('You are not assigned to this class');
    }
    match.class = filters.classId ? filters.classId : { $in: ids };
  }
  if (user.role === 'student') {
    const me = await Student.findOne({ user: user._id }).select('_id');
    if (!me) throw ApiError.forbidden('No student profile linked to this account');
    match.student = me._id;
  }
  return match;
}

/**
 * Per-student attendance summary for the given filters.
 * Returns rows plus an overall aggregate and (optionally) class/subject splits.
 */
async function getSummary(filters, user) {
  const settings = await getSettings();
  const match = await buildMatch(filters, user);

  const rows = await Attendance.aggregate([
    { $match: match },
    {
      $group: {
        _id: { student: '$student', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);

  const byStudent = new Map();
  for (const r of rows) {
    const key = String(r._id.student);
    if (!byStudent.has(key)) byStudent.set(key, { present: 0, absent: 0, late: 0, excused: 0, total: 0 });
    const e = byStudent.get(key);
    if (e[r._id.status] !== undefined) e[r._id.status] += r.count;
    e.total += r.count;
  }

  const studentIds = [...byStudent.keys()];
  const students = await Student.find({ _id: { $in: studentIds } })
    .select('name rollNo email class parentContact')
    .populate('class', 'name section')
    .lean();
  const studentMap = new Map(students.map((s) => [String(s._id), s]));

  let result = [...byStudent.entries()].map(([id, stats]) => {
    const s = studentMap.get(id) || {};
    return {
      studentId: id,
      rollNo: s.rollNo || '',
      name: s.name || 'Unknown',
      email: s.email || '',
      className: s.class ? `${s.class.name}-${s.class.section}` : '',
      classId: s.class?._id || null,
      present: stats.present,
      absent: stats.absent,
      late: stats.late,
      excused: stats.excused,
      total: stats.total,
      percentage: computePercentage(stats, settings),
      belowThreshold: computePercentage(stats, settings) < settings.minAttendancePercent,
    };
  });

  if (filters.search) {
    const q = String(filters.search).toLowerCase();
    result = result.filter((r) => r.name.toLowerCase().includes(q) || r.rollNo.toLowerCase().includes(q));
  }
  result.sort((a, b) => a.percentage - b.percentage || a.rollNo.localeCompare(b.rollNo));

  const overall = result.reduce(
    (acc, r) => {
      acc.present += r.present;
      acc.absent += r.absent;
      acc.late += r.late;
      acc.excused += r.excused;
      acc.total += r.total;
      return acc;
    },
    { present: 0, absent: 0, late: 0, excused: 0, total: 0 }
  );
  overall.percentage = computePercentage(overall, settings);

  const classWise = {};
  for (const r of result) {
    const key = r.className || 'Unassigned';
    if (!classWise[key]) classWise[key] = { name: key, present: 0, absent: 0, late: 0, excused: 0, total: 0, students: 0 };
    const b = classWise[key];
    b.present += r.present;
    b.absent += r.absent;
    b.late += r.late;
    b.excused += r.excused;
    b.total += r.total;
    b.students += 1;
  }
  Object.values(classWise).forEach((b) => {
    b.percentage = computePercentage(b, settings);
  });

  return {
    range: {
      from: filters.from ? toDateKey(filters.from) : null,
      to: filters.to ? toDateKey(filters.to) : null,
    },
    overall,
    students: result,
    classWise: Object.values(classWise),
    settings: { minAttendancePercent: settings.minAttendancePercent, academicYear: settings.academicYear },
    generatedAt: new Date().toISOString(),
  };
}

/** Detailed per-day records for a filtered export. */
async function getDetailedRecords(filters, user) {
  const match = await buildMatch(filters, user);
  const records = await Attendance.find(match)
    .populate('student', 'name rollNo')
    .populate('class', 'name section')
    .populate('subject', 'name code')
    .populate('markedBy', 'name')
    .sort({ date: 1, 'student.rollNo': 1 })
    .lean();

  return records.map((r) => ({
    date: toDateKey(r.date),
    rollNo: r.student?.rollNo || '',
    student: r.student?.name || '',
    className: r.class ? `${r.class.name}-${r.class.section}` : '',
    subject: r.subject ? `${r.subject.name} (${r.subject.code})` : '',
    status: r.status,
    remarks: r.remarks || '',
    markedBy: r.markedBy?.name || '',
  }));
}

const SUMMARY_COLUMNS = [
  { key: 'rollNo', header: 'Roll No' },
  { key: 'name', header: 'Student' },
  { key: 'className', header: 'Class' },
  { key: 'present', header: 'Present' },
  { key: 'absent', header: 'Absent' },
  { key: 'late', header: 'Late' },
  { key: 'excused', header: 'Excused' },
  { key: 'total', header: 'Total' },
  { key: 'percentage', header: 'Percentage' },
];

const DETAIL_COLUMNS = [
  { key: 'date', header: 'Date' },
  { key: 'rollNo', header: 'Roll No' },
  { key: 'student', header: 'Student' },
  { key: 'className', header: 'Class' },
  { key: 'subject', header: 'Subject' },
  { key: 'status', header: 'Status' },
  { key: 'remarks', header: 'Remarks' },
  { key: 'markedBy', header: 'Marked By' },
];

async function buildExport(filters, user, { type = 'summary' } = {}) {
  const columns = type === 'detailed' ? DETAIL_COLUMNS : SUMMARY_COLUMNS;
  const rows = type === 'detailed'
    ? await getDetailedRecords(filters, user)
    : (await getSummary(filters, user)).students;
  const summary = type === 'detailed' ? null : await getSummary(filters, user);
  return { columns, rows, summary, type };
}

function exportCSV({ columns, rows }) {
  return toCSV(rows, columns);
}

async function exportExcel({ columns, rows, summary, type }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Attendance Management System';
  wb.created = new Date();
  const ws = wb.addWorksheet(type === 'detailed' ? 'Attendance Detail' : 'Attendance Summary');

  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: Math.max(12, c.header.length + 4) }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } };
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  rows.forEach((r) => ws.addRow(r));

  if (summary) {
    ws.addRow([]);
    const totalRow = ws.addRow(['Overall', '', '', summary.overall.present, summary.overall.absent, summary.overall.late, summary.overall.excused, summary.overall.total, summary.overall.percentage]);
    totalRow.font = { bold: true };
  }
  ws.autoFilter = { from: 'A1', to: { row: 1, column: columns.length } };
  return wb.xlsx.writeBuffer();
}

function exportPDF({ columns, rows, summary, meta = {} }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).font('Helvetica-Bold').text('Attendance Report', { align: 'left' });
      doc.moveDown(0.2);
      doc.fontSize(9).font('Helvetica').fillColor('#555555');
      doc.text(`Generated: ${new Date().toLocaleString()}`);
      if (meta.range?.from || meta.range?.to) {
        doc.text(`Period: ${meta.range?.from || '—'} to ${meta.range?.to || '—'}`);
      }
      doc.fillColor('#000000');
      doc.moveDown(0.8);

      const startX = doc.page.margins.left;
      const usable = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const colWidth = usable / columns.length;

      const drawHeader = () => {
        const y = doc.y;
        doc.rect(startX, y, usable, 18).fill('#111111');
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
        columns.forEach((c, i) => {
          doc.text(c.header, startX + i * colWidth + 3, y + 5, { width: colWidth - 6, ellipsis: true });
        });
        doc.fillColor('#000000').font('Helvetica').fontSize(8);
        doc.y = y + 22;
      };

      drawHeader();

      let count = 0;
      for (const row of rows) {
        if (doc.y > doc.page.height - doc.page.margins.bottom - 24) {
          doc.addPage();
          drawHeader();
        }
        const y = doc.y;
        if (count % 2 === 0) {
          doc.rect(startX, y - 2, usable, 16).fill('#f4f4f5').fillColor('#000000');
        }
        columns.forEach((c, i) => {
          doc.text(String(row[c.key] ?? ''), startX + i * colWidth + 3, y, {
            width: colWidth - 6,
            ellipsis: true,
          });
        });
        doc.y = y + 16;
        count += 1;
      }

      if (summary) {
        doc.moveDown(1);
        doc.font('Helvetica-Bold').fontSize(10).text(
          `Overall: ${summary.overall.percentage}% — Present ${summary.overall.present}, Absent ${summary.overall.absent}, Late ${summary.overall.late}, Excused ${summary.overall.excused} (of ${summary.overall.total} records)`
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { getSummary, getDetailedRecords, buildExport, exportCSV, exportExcel, exportPDF };
