// scripts/seed-auth.js
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; // point Admin SDK to emulator

const admin = require('firebase-admin');

// IMPORTANT: your emulator projectId
admin.initializeApp({ projectId: 'onlinestoretemplate-59d3e' });

(async () => {
  try {
    const email = 'unkhamov@gmail.com';
    const password = 'admin777';
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
      console.log('User already exists:', user.uid);
    } catch {
      user = await admin.auth().createUser({
        email,
        password,
        displayName: 'Uni Khamov',
      });
      console.log('Created user:', user.uid);
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
