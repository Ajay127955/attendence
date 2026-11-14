'use strict';

const mongoose = require('mongoose');

const STATUSES = ['present', 'absent', 'late', 'excused'];

const attendanceSchema = new mongoose.Schema(
  {
    // Stored as UTC midnight — see utils/dates.js#toDateOnly
    date: { type: Date, required: [true, 'Date is required'], index: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    status: { type: String, enum: STATUSES, required: true, index: true },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    remarks: { type: String, trim: true, default: '', maxlength: 300 },
  },
  { timestamps: true }
);

/**
 * The core guarantee: re-marking the same (date, student, subject) updates the
 * existing record instead of creating a duplicate. `subject` null is treated as
 * a value by MongoDB so a class-wide (subject-less) record is unique too.
 */
attendanceSchema.index({ date: 1, student: 1, subject: 1 }, { unique: true });
// Speeds up the common "class + date" dashboard queries.
attendanceSchema.index({ class: 1, date: 1, status: 1 });
attendanceSchema.index({ student: 1, date: 1 });

attendanceSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model('Attendance', attendanceSchema);
