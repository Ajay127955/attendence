'use strict';

/** Realistic name pools used to generate the demo dataset. */
const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Diya', 'Aanya', 'Aadhya', 'Ananya', 'Pari', 'Anika', 'Navya', 'Sara', 'Myra', 'Riya',
  'Kabir', 'Rudra', 'Atharv', 'Shaurya', 'Dhruv', 'Advik', 'Pranav', 'Aryan', 'Yuvan', 'Rohan',
  'Ira', 'Kiara', 'Siya', 'Prisha', 'Aarohi', 'Nitya', 'Meera', 'Tara', 'Zara', 'Nisha',
];
const LAST_NAMES = [
  'Sharma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Verma', 'Reddy', 'Nair', 'Iyer', 'Mehta',
  'Joshi', 'Rao', 'Das', 'Chopra', 'Malhotra', 'Bose', 'Kapoor', 'Menon', 'Pillai', 'Shah',
];

const TEACHERS = [
  { name: 'Priya Menon', email: 'priya.menon@ams.dev' },
  { name: 'Rahul Verma', email: 'rahul.verma@ams.dev' },
  { name: 'Sneha Kapoor', email: 'sneha.kapoor@ams.dev' },
];

const CLASSES = [
  { name: 'Grade 10', section: 'A', room: 'R-201' },
  { name: 'Grade 10', section: 'B', room: 'R-202' },
];

const SUBJECTS = [
  { name: 'Mathematics', code: 'MATH10', credits: 5 },
  { name: 'Physics', code: 'PHY10', credits: 4 },
  { name: 'English', code: 'ENG10', credits: 3 },
];

/** Weighted status picker — most students present, a realistic tail. */
function pickStatus() {
  const r = Math.random();
  if (r < 0.82) return 'present';
  if (r < 0.92) return 'absent';
  if (r < 0.97) return 'late';
  return 'excused';
}

/** Per-student bias so some students are consistently low attenders. */
function statusForStudent(bias) {
  const r = Math.random() + bias;
  if (r < 0.78) return 'present';
  if (r < 0.9) return 'absent';
  if (r < 0.96) return 'late';
  return 'excused';
}

module.exports = { FIRST_NAMES, LAST_NAMES, TEACHERS, CLASSES, SUBJECTS, pickStatus, statusForStudent };
