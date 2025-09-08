// scripts/export-prod.js
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Put your key under ./keys and NEVER commit it
const keyPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '../keys/service-account.json');

let serviceAccount;
try {
  serviceAccount = require(keyPath);
} catch (e) {
  console.error('Service account JSON not found at:', keyPath);
  console.error(
    'Set GOOGLE_APPLICATION_CREDENTIALS or place the key at ./keys/service-account.json',
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

(async () => {
  const out = { categories: [], products: [] };
  for (const coll of ['categories', 'products']) {
    const snap = await db.collection(coll).get();
    out[coll] = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
    console.log(`Exported ${out[coll].length} ${coll}`);
  }
  const file = path.join(__dirname, '../tmp/firestore-export.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`Wrote ${file}`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
