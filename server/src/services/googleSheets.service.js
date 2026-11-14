'use strict';

const { google } = require('googleapis');
const env = require('../config/env');
const logger = require('../config/logger');

/**
 * Optional Google Sheets mirror. When GOOGLE_SHEETS_ENABLED is false every
 * function is a safe no-op so the rest of the app is unaffected.
 *
 * Setup:
 *   1. Create a Google Cloud service account and download its JSON key.
 *   2. Share the target spreadsheet with the service account email (Editor).
 *   3. Set GOOGLE_SHEETS_ENABLED=true, GOOGLE_SHEETS_ID and the credentials.
 */

const HEADERS = [
  'Date',
  'Class',
  'Subject',
  'Roll No',
  'Student',
  'Status',
  'Remarks',
  'Marked By',
  'Updated At',
];

function isEnabled() {
  return Boolean(env.GOOGLE_SHEETS_ENABLED && env.GOOGLE_SHEETS_ID && env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.googlePrivateKey);
}

let sheetsClient = null;

function getClient() {
  if (sheetsClient) return sheetsClient;
  const auth = new google.auth.JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: env.googlePrivateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

async function ensureSheet() {
  const sheets = getClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: env.GOOGLE_SHEETS_ID });
  const hasSheet = meta.data.sheets?.some((s) => s.properties.title === 'Attendance');
  if (!hasSheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: env.GOOGLE_SHEETS_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: 'Attendance' } } }] },
    });
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: env.GOOGLE_SHEETS_ID,
    range: 'Attendance!A1:I1',
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS] },
  });
}

/** Appends attendance rows (idempotent-ish: callers pass only fresh records). */
async function appendRows(rows) {
  if (!isEnabled() || !rows.length) return { synced: 0, enabled: isEnabled() };
  try {
    await ensureSheet();
    const values = rows.map((r) => [
      r.date,
      r.class,
      r.subject || '',
      r.rollNo,
      r.student,
      r.status,
      r.remarks || '',
      r.markedBy || '',
      r.updatedAt || new Date().toISOString(),
    ]);
    await getClient().spreadsheets.values.append({
      spreadsheetId: env.GOOGLE_SHEETS_ID,
      range: 'Attendance!A2',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
    logger.info(`Google Sheets: appended ${values.length} attendance rows`);
    return { synced: values.length, enabled: true };
  } catch (err) {
    logger.error(`Google Sheets sync failed: ${err.message}`);
    return { synced: 0, enabled: true, error: err.message };
  }
}

/** Replaces the whole sheet with the provided rows (used by "full export"). */
async function replaceAll(rows) {
  if (!isEnabled()) return { synced: 0, enabled: false };
  try {
    await ensureSheet();
    await getClient().spreadsheets.values.clear({
      spreadsheetId: env.GOOGLE_SHEETS_ID,
      range: 'Attendance!A2:I',
    });
    const values = rows.map((r) => [
      r.date,
      r.class,
      r.subject || '',
      r.rollNo,
      r.student,
      r.status,
      r.remarks || '',
      r.markedBy || '',
      r.updatedAt || '',
    ]);
    if (values.length) {
      await getClient().spreadsheets.values.update({
        spreadsheetId: env.GOOGLE_SHEETS_ID,
        range: 'Attendance!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
    }
    logger.info(`Google Sheets: replaced sheet with ${values.length} rows`);
    return { synced: values.length, enabled: true };
  } catch (err) {
    logger.error(`Google Sheets full sync failed: ${err.message}`);
    return { synced: 0, enabled: true, error: err.message };
  }
}

async function status() {
  if (!env.GOOGLE_SHEETS_ENABLED) return { enabled: false, configured: false };
  return {
    enabled: true,
    configured: isEnabled(),
    spreadsheetId: env.GOOGLE_SHEETS_ID ? `${env.GOOGLE_SHEETS_ID.slice(0, 6)}…` : null,
    serviceAccount: env.GOOGLE_SERVICE_ACCOUNT_EMAIL || null,
  };
}

module.exports = { isEnabled, appendRows, replaceAll, status, HEADERS };
