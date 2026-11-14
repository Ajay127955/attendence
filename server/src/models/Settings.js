'use strict';

const mongoose = require('mongoose');

/**
 * Singleton settings document. Read through services/settings.service.js
 * which lazily creates the document with sensible defaults.
 */
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true, immutable: true },
    academicYear: { type: String, default: () => {
      const y = new Date().getFullYear();
      return `${y}-${y + 1}`;
    } },
    minAttendancePercent: { type: Number, default: 75, min: 0, max: 100 },
    lateCountsAsPresent: { type: Boolean, default: true },
    // How many days back a teacher may edit attendance (0 = today only).
    editWindowDays: { type: Number, default: 7, min: 0, max: 90 },
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5], // Mon–Fri (0 = Sunday)
      validate: {
        validator: (arr) => arr.every((d) => d >= 0 && d <= 6),
        message: 'Working days must be between 0 (Sun) and 6 (Sat)',
      },
    },
    holidays: { type: [{ date: Date, name: String }], default: [] },
    schoolName: { type: String, default: 'Attendance Management System' },
    timezone: { type: String, default: 'UTC' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
