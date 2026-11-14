'use strict';

const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Subject name is required'], trim: true, maxlength: 120 },
    code: { type: String, required: [true, 'Subject code is required'], trim: true, uppercase: true, unique: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    credits: { type: Number, default: 0, min: 0, max: 20 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subject', subjectSchema);
