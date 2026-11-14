'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const { getSettings, updateSettings } = require('../services/settings.service');
const { recordAudit } = require('../middleware/audit');
const googleSheets = require('../services/googleSheets.service');

const get = asyncHandler(async (_req, res) => {
  const settings = await getSettings();
  return ok(res, settings, 'Settings');
});

const update = asyncHandler(async (req, res) => {
  const before = (await getSettings()).toObject();
  const settings = await updateSettings(req.body, req.user._id);
  await recordAudit({
    req,
    action: 'settings.update',
    entity: 'Settings',
    entityId: settings._id,
    before: { minAttendancePercent: before.minAttendancePercent, academicYear: before.academicYear },
    after: req.body,
  });
  return ok(res, settings, 'Settings updated');
});

const googleSheetsStatus = asyncHandler(async (_req, res) => {
  return ok(res, await googleSheets.status(), 'Google Sheets status');
});

module.exports = { get, update, googleSheetsStatus };
