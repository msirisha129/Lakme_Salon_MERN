require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/lakme_salon';

async function main() {
  await mongoose.connect(MONGO, { serverSelectionTimeoutMS: 30000 });
  console.log('Connected to MongoDB');

  const email = 'msirisha454@gmail.com';
  const name = 'Dev Admin';
  const phone = '0000000000';
  const plainPassword = 'ChangeMe123!'; // dev script convenience - not stored in repo

  const hashed = await bcrypt.hash(plainPassword, 12);

  const usersColl = mongoose.connection.db.collection('users');

  // Show existing document before change
  const before = await usersColl.findOne({ email: email.toLowerCase() });
  console.log('--- BEFORE (existing user document, or null if not found) ---');
  console.log(JSON.stringify(before, null, 2));

  // Upsert: if user exists, set role to admin; if not, insert with hashed password
  const res = await usersColl.updateOne(
    { email: email.toLowerCase() },
    {
      $set: { role: 'admin' },
      $setOnInsert: {
        name,
        email: email.toLowerCase(),
        phone,
        password: hashed,
        avatar: '',
        loyaltyPoints: 0,
        voiceTrialsUsed: 0,
        createdAt: new Date()
      }
    },
    { upsert: true }
  );

  if (res.upsertedCount === 1) {
    console.log('Admin user created (upsert).');
  } else {
    console.log('Existing user updated to admin role (password preserved).');
  }

  // Show the exact document after change
  const doc = await usersColl.findOne({ email: email.toLowerCase() });
  console.log('--- AFTER (MongoDB document for admin user) ---');
  console.log(JSON.stringify(doc, null, 2));

  console.log('\nVerification query (mongo shell):');
  console.log(`db.users.findOne({ email: '${email.toLowerCase()}' })`);

  console.log('\nTo login as this admin in development use the email above and the password you provided when running this script.');
  console.log('Recommended: change password via admin UI or force-reset after first login.');

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
