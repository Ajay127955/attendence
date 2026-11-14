'use strict';

const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../config/logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

/**
 * Sends an email. When SMTP is not configured (local dev / demo) the message
 * is written to the log instead so the password-reset flow is still testable.
 */
async function sendMail({ to, subject, html, text }) {
  const tx = getTransporter();
  if (!tx) {
    logger.warn('SMTP not configured — email not sent (logged instead)', { to, subject });
    logger.info(`✉  [DEV MAIL] To: ${to} | Subject: ${subject}\n${text || html}`);
    return { queued: false, preview: true };
  }
  await tx.sendMail({ from: env.MAIL_FROM, to, subject, html, text });
  logger.info(`✉  Email sent to ${to}: ${subject}`);
  return { queued: true };
}

function resetPasswordEmail({ name, link }) {
  const text = `Hi ${name},\n\nReset your Attendance Management System password using the link below.\n${link}\n\nThis link expires in 30 minutes. If you did not request it, ignore this email.`;
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e5e5;border-radius:12px">
      <h2 style="margin:0 0 8px">Reset your password</h2>
      <p style="color:#555">Hi ${name}, we received a request to reset your AMS password.</p>
      <p style="margin:24px 0">
        <a href="${link}" style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Reset password</a>
      </p>
      <p style="color:#777;font-size:13px">This link expires in 30 minutes. If you didn't request it, you can safely ignore this email.</p>
    </div>`;
  return { subject: 'Reset your AMS password', text, html };
}

module.exports = { sendMail, resetPasswordEmail, getTransporter };
