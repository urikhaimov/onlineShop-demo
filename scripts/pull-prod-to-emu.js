// Copy Cloud Firestore -> local emulator (categories, products)
// Prereqs: `gcloud auth application-default login` or set GOOGLE_APPLICATION_CREDENTIALS
// Usage: node scripts/pull-prod-to-emu.js

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID =
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  'onlinestoretemplate-59d3e';
const EMU_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

// --- 1) init PROD app (Cloud)
const prodApp = initializeApp(
  { projectId: PROJECT_ID, credential: applicationDefault() },
  'prod',
);
const prodDb = getFirestore(prodApp);

// --- 2) init EMULATOR app (local)
process.env.FIRESTORE_EMULATOR_HOST = EMU_HOST; // must be set BEFORE creating the emu app
const emuApp = initializeApp({ projectId: PROJECT_ID }, 'emu');
const emuDb = getFirestore(emuApp);

async function copyCollection(colName) {
  console.log(`\nCopying collection: ${colName}`);
  const snap = await prodDb.collection(colName).get();
  console.log(`  found ${snap.size} docs`);

  let i = 0;
  for (const doc of snap.docs) {
    await emuDb
      .collection(colName)
      .doc(doc.id)
      .set(doc.data(), { merge: true });
    if (++i % 100 === 0) console.log(`  wrote ${i}/${snap.size}...`);
  }
  console.log(`  ✅ done ${colName}: ${i} docs`);
}

(async () => {
  console.log(`PROJECT: ${PROJECT_ID}`);
  console.log(`EMU:     ${EMU_HOST}`);
  await copyCollection('categories');
  await copyCollection('products');
  console.log(
    '\n🎉 Copy complete. Open http://127.0.0.1:4000/firestore to verify.',
  );
  process.exit(0);
})().catch((e) => {
  console.error('❌ copy failed', e);
  process.exit(1);
});
