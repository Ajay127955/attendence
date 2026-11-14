'use strict';

const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Class name is required'], trim: true, maxlength: 80 },
    section: { type: String, trim: true, uppercase: true, default: 'A', maxlength: 10 },
    academicYear: {
      type: String,
      required: true,
      trim: true,
      default: () => {
        const y = new Date().getFullYear();
        return `${y}-${y + 1}`;
      },
    },
    room: { type: String, trim: true, default: '' },
    teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  },
  { timestamps: true }
);

classSchema.index({ name: 1, section: 1, academicYear: 1 }, { unique: true });

classSchema.virtual('label').get(function () {
  return `${this.name}${this.section ? `-${this.section}` : ''}`;
});

module.exports = mongoose.model('Class', classSchema);
