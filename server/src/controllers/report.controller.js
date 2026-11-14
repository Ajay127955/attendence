'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const reportService = require('../services/report.service');
const { lowAttendanceStudents } = require('../services/attendanceStats.service');
const { toDateKey } = require('../utils/dates');

const summary = asyncHandler(async (req, res) => {
  const data = await reportService.getSummary(req.query, req.user);
  return ok(res, data, 'Report summary');
});

const detailed = asyncHandler(async (req, res) => {
  const data = await reportService.getDetailedRecords(req.query, req.user);
  return ok(res, data, 'Detailed records');
});

const lowAttendance = asyncHandler(async (req, res) => {
  const data = await lowAttendanceStudents({
    classId: req.query.classId,
    threshold: req.query.threshold,
    limit: req.query.limit,
  });
  return ok(res, data, 'Low attendance students');
});

/**
 * Streams a CSV / Excel / PDF export with correct headers so the browser
 * triggers a download.
 */
const exportReport = asyncHandler(async (req, res) => {
  const { format, type, ...filters } = req.query;
  const payload = await reportService.buildExport(filters, req.user, { type });
  const stamp = toDateKey(new Date());
  const base = `attendance-${type}-${stamp}`;

  if (format === 'excel') {
    const buffer = await reportService.exportExcel(payload);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${base}.xlsx"`);
    return res.send(Buffer.from(buffer));
  }

  if (format === 'pdf') {
    const buffer = await reportService.exportPDF({ ...payload, meta: { range: payload.summary?.range } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${base}.pdf"`);
    return res.send(buffer);
  }

  const csv = reportService.exportCSV(payload);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${base}.csv"`);
  return res.send(csv);
});

module.exports = { summary, detailed, lowAttendance, exportReport };
