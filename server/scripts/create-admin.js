'use strict';

/**
 * Creates (or updates) an admin account.
 *
 *   npm run create-admin -- --email admin@yourschool.edu --name "Principal" --password "Str0ng@Pass"
 *
 * The same values may be provided through the ADMIN_NAME / ADMIN_EMAIL /
 * ADMIN_PASSWORD environment variables. This is the supported way to create the
 * first admin, because POST /auth/register itself requires an existing admin.
 */

const dns = require('dns');
try {
  // Some networks need explicit resolvers for the Atlas SRV record.
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  /* ignore */
}

const { connectDB, disconnectDB } = require('../src/config/db');
const { User } = require('../src/models');

/** Reads `--name value` from the CLI, falling back to `fallback`. */
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const USAGE = `
Create or update an admin account.

  npm run create-admin -- --email <email> --name "<name>" --password "<password>"

Options:
  --email     Admin email (required)
  --name      Display name (default: Administrator)
  --password  Password, min 8 chars with a letter and a number (required)

Or set ADMIN_EMAIL / ADMIN_NAME / ADMIN_PASSWORD in the environment.
`.trim();

(async () => {
  const email = String(arg('email', process.env.ADMIN_EMAIL || '')).trim().toLowerCase();
  const name = String(arg('name', process.env.ADMIN_NAME || 'Administrator')).trim();
  const password = String(arg('password', process.env.ADMIN_PASSWORD || ''));

  if (!email || !password) {
    console.error(`\n${USAGE}\n`);
    process.exit(1);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`\nInvalid email: ${email}\n`);
    process.exit(1);
  }
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    console.error('\nPassword must be at least 8 characters and contain a letter and a number.\n');
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    existing.name = name;
    existing.role = 'admin';
    existing.isActive = true;
    await existing.setPassword(password);
    await existing.save();
    console.log(`✔ Updated admin: ${email}`);
  } else {
    const user = new User({ name, email, role: 'admin', isActive: true });
    await user.setPassword(password);
    await user.save();
    console.log(`✔ Created admin: ${email}`);
  }

  await disconnectDB();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
