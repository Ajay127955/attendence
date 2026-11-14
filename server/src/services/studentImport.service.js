'use strict';

const { parse } = require('csv-parse/sync');
const { z } = require('zod');
const { Student, Class, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { recordAudit } = require('../middleware/audit');
const env = require('../config/env');
const logger = require('../config/logger');

/** Accepts many header spellings so users don't fight the template. */
const HEADER_ALIASES = {
  rollno: 'rollNo',
  'roll no': 'rollNo',
  'roll number': 'rollNo',
  roll_number: 'rollNo',
  studentid: 'rollNo',
  name: 'name',
  studentname: 'name',
  'student name': 'name',
  fullname: 'name',
  email: 'email',
  'e-mail': 'email',
  phone: 'phone',
  mobile: 'phone',
  contact: 'phone',
  class: 'className',
  classname: 'className',
  'class name': 'className',
  section: 'section',
  parentcontact: 'parentContact',
  'parent contact': 'parentContact',
  guardian: 'guardianName',
  guardianname: 'guardianName',
  gender: 'gender',
  address: 'address',
};

function normaliseHeader(h) {
  const key = String(h || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return HEADER_ALIASES[key] || HEADER_ALIASES[key.replace(/\s/g, '')] || null;
}

const rowSchema = z.object({
  rollNo: z.string().trim().min(1, 'Roll number is required').max(40),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z
    .string()
    .trim()
    .email('Invalid email')
    .optional()
    .or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  className: z.string().trim().min(1, 'Class is required'),
  section: z.string().trim().max(10).optional().or(z.literal('')),
  parentContact: z.string().trim().max(40).optional().or(z.literal('')),
  guardianName: z.string().trim().max(120).optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other', '']).optional().or(z.literal('')),
  address: z.string().trim().max(300).optional().or(z.literal('')),
});

const TEMPLATE_HEADERS = ['rollNo', 'name', 'email', 'phone', 'className', 'section', 'parentContact', 'guardianName', 'gender'];

function templateCSV() {
  const sample = [
    ['S1001', 'Aarav Sharma', 'aarav@example.com', '9876543210', 'Grade 10', 'A', '9876500000', 'Rakesh Sharma', 'male'],
    ['S1002', 'Diya Patel', 'diya@example.com', '9876543211', 'Grade 10', 'A', '9876500001', 'Meena Patel', 'female'],
  ];
  return [TEMPLATE_HEADERS.join(','), ...sample.map((r) => r.join(','))].join('\n') + '\n';
}

/**
 * Imports students from a CSV buffer.
 *  - Validates every row and reports per-row errors (never silently drops).
 *  - Resolves/creates classes by "Name-Section".
 *  - Optionally provisions a student login account (role=student).
 *  - `dryRun` validates without writing — powers the preview step in the UI.
 */
async function importStudentsFromCSV(buffer, { user, req, dryRun = false, createAccounts = true } = {}) {
  if (!buffer || !buffer.length) throw ApiError.badRequest('CSV file is empty');

  let records;
  try {
    records = parse(buffer, {
      columns: (header) => header.map((h) => normaliseHeader(h) || String(h).trim()),
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    });
  } catch (err) {
    throw ApiError.badRequest(`Could not parse CSV: ${err.message}`);
  }

  if (!records.length) throw ApiError.badRequest('CSV contains no data rows');

  const errors = [];
  const validRows = [];
  const seen = new Set();

  records.forEach((raw, idx) => {
    const line = idx + 2; // +2: 1-based + header row
    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({ line, rollNo: raw.rollNo || '', message: parsed.error.issues.map((i) => i.message).join('; ') });
      return;
    }
    const row = parsed.data;
    if (seen.has(row.rollNo.toUpperCase())) {
      errors.push({ line, rollNo: row.rollNo, message: 'Duplicate roll number within the file' });
      return;
    }
    seen.add(row.rollNo.toUpperCase());
    validRows.push({ ...row, line });
  });

  // Existing roll numbers
  const existing = await Student.find({ rollNo: { $in: validRows.map((r) => r.rollNo.toUpperCase()) } })
    .select('rollNo')
    .lean();
  const existingSet = new Set(existing.map((s) => s.rollNo));
  const toCreate = validRows.filter((r) => {
    if (existingSet.has(r.rollNo.toUpperCase())) {
      errors.push({ line: r.line, rollNo: r.rollNo, message: 'A student with this roll number already exists' });
      return false;
    }
    return true;
  });

  if (dryRun) {
    return {
      dryRun: true,
      totalRows: records.length,
      validCount: toCreate.length,
      invalidCount: errors.length,
      errors,
      preview: toCreate.slice(0, 25),
    };
  }

  // Resolve classes
  const classKeys = [...new Set(toCreate.map((r) => `${r.className}||${(r.section || 'A').toUpperCase()}`))];
  const classMap = new Map();
  for (const key of classKeys) {
    const [name, section] = key.split('||');
    let cls = await Class.findOne({ name, section });
    if (!cls) cls = await Class.create({ name, section });
    classMap.set(key, cls);
  }

  const created = [];
  const accountErrors = [];
  for (const row of toCreate) {
    const key = `${row.className}||${(row.section || 'A').toUpperCase()}`;
    const cls = classMap.get(key);

    let account = null;
    if (createAccounts) {
      const email = row.email || `${row.rollNo.toLowerCase()}@student.ams.dev`;
      const existingUser = await User.findOne({ $or: [{ email }, { rollNo: row.rollNo.toUpperCase() }] });
      if (existingUser) {
        account = existingUser;
      } else {
        try {
          account = new User({ name: row.name, email, rollNo: row.rollNo.toUpperCase(), role: 'student', phone: row.phone || '' });
          await account.setPassword(env.SEED_STUDENT_PASSWORD);
          await account.save();
        } catch (err) {
          accountErrors.push({ rollNo: row.rollNo, message: err.message });
        }
      }
    }

    const student = await Student.create({
      rollNo: row.rollNo.toUpperCase(),
      name: row.name,
      email: row.email || '',
      phone: row.phone || '',
      class: cls._id,
      parentContact: row.parentContact || '',
      guardianName: row.guardianName || '',
      gender: row.gender || '',
      address: row.address || '',
      user: account?._id || null,
    });

    await Class.findByIdAndUpdate(cls._id, { $addToSet: { students: student._id } });
    created.push(student);
  }

  await recordAudit({
    req: req || { user },
    action: 'student.bulkImport',
    entity: 'Student',
    description: `Imported ${created.length} students from CSV (${errors.length} errors)`,
    after: { created: created.length, errors: errors.length },
  });

  logger.info(`CSV import: ${created.length} students created, ${errors.length} errors`);

  return {
    dryRun: false,
    totalRows: records.length,
    createdCount: created.length,
    invalidCount: errors.length,
    errors: [...errors, ...accountErrors.map((e) => ({ line: '-', rollNo: e.rollNo, message: `Account: ${e.message}` }))],
    created: created.map((s) => ({ _id: s._id, rollNo: s.rollNo, name: s.name })),
  };
}

module.exports = { importStudentsFromCSV, templateCSV, TEMPLATE_HEADERS };
