'use strict';

const Settings = require('../models/Settings');

const DEFAULTS = {
  key: 'global',
  academicYear: (() => {
    const y = new Date().getFullYear();
    return `${y}-${y + 1}`;
  })(),
  minAttendancePercent: 75,
  lateCountsAsPresent: true,
  editWindowDays: 7,
  workingDays: [1, 2, 3, 4, 5],
  holidays: [],
  schoolName: 'Attendance Management System',
  timezone: 'UTC',
};

/** Returns the singleton settings document, creating it on first access. */
async function getSettings() {
  let doc = await Settings.findOne({ key: 'global' });
  if (!doc) doc = await Settings.create(DEFAULTS);
  return doc;
}

async function updateSettings(patch, userId) {
  await getSettings(); // ensure it exists
  const doc = await Settings.findOneAndUpdate(
    { key: 'global' },
    { $set: { ...patch, updatedBy: userId || null } },
    { new: true, runValidators: true }
  );
  return doc;
}

/** True when the given date (UTC) is a configured working day and not a holiday. */
function isWorkingDay(date, settings) {
  const d = date instanceof Date ? date : new Date(date);
  const dow = d.getUTCDay();
  if (!settings.workingDays.includes(dow)) return false;
  const key = d.toISOString().slice(0, 10);
  return !(settings.holidays || []).some((h) => new Date(h.date).toISOString().slice(0, 10) === key);
}

module.exports = { getSettings, updateSettings, isWorkingDay, DEFAULTS };
