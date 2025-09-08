// Import categories + products JSON into the Firestore Emulator.
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'onlinestoretemplate-59d3e' });
const db = admin.firestore();

(async () => {
  const file = path.join(__dirname, '../tmp/firestore-export.json');
  const dump = JSON.parse(fs.readFileSync(file, 'utf8'));

  async function writeCollection(name, rows) {
    console.log(`Importing ${rows.length} ${name}...`);
    const batchSize = 400;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = db.batch();
      for (const { id, data } of rows.slice(i, i + batchSize)) {
        // keep the same document IDs so relations (categoryId) line up
        batch.set(db.collection(name).doc(id), data, { merge: true });
      }
      await batch.commit();
    }
  }

  await writeCollection('categories', dump.categories || []);
  await writeCollection('products', dump.products || []);
  console.log('Done.');
  process.exit(0);
})();
