/* eslint-disable */
// scripts/set-admin.js
// Usage: node scripts/set-admin.js <email>
// Example: node scripts/set-admin.js urikhaimov@gmail.com
require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
  override: true,
});

const admin = require('firebase-admin');

const privateKey = (process.env.FB_ADMIN_PRIVATE_KEY || '')
  .replace(/\\n/g, '\n')
  .replace(/^"|"$/g, '');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FB_ADMIN_PROJECT_ID,
    clientEmail: process.env.FB_ADMIN_CLIENT_EMAIL,
    privateKey,
  }),
});

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/set-admin.js <email>');
  process.exit(1);
}

(async () => {
  try {
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
      console.log(`   Found existing user: ${user.uid}`);
    } catch {
      user = await admin.auth().createUser({ email, emailVerified: true });
      console.log(`   Created new user: ${user.uid}`);
    }
    await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
    console.log(`✅ Set role=admin for ${email} (uid: ${user.uid})`);
    console.log('   Sign out and sign back in to get the updated token.');
    process.exit(0);
  } catch (e) {
    console.error('❌ Failed:', e.message);
    process.exit(1);
  }
})();
