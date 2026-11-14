'use strict';

const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    rollNo: { type: String, required: [true, 'Roll number is required'], trim: true, uppercase: true, unique: true },
    name: { type: String, required: [true, 'Student name is required'], trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    parentContact: { type: String, trim: true, default: '' },
    guardianName: { type: String, trim: true, default: '' },
    gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    dateOfBirth: { type: Date, default: null },
    address: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    // Optional link to a login account (students can sign in).
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true }
);

studentSchema.index({ name: 'text', rollNo: 'text', email: 'text' });

module.exports = mongoose.model('Student', studentSchema);
