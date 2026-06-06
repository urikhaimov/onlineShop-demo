/* eslint-disable */
// scripts/seed-catalog.js
// Seeds categories and products only (no orders / landing / settings).
// Run against emulator:  npm run emu:seed:catalog
// Run against prod:      node scripts/seed-catalog.js --overwrite
//
// Flags:
//   --overwrite   Replace existing documents instead of skipping them.

// Load root .env first (contains FB_ADMIN_* credentials), then api .env for
// anything else. Override=false so already-set vars (e.g. from cross-env) win.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../apps/api/.env') });

const admin = require('firebase-admin');

const OVERWRITE = process.argv.includes('--overwrite');
const USE_EMULATOR = !!process.env.FIRESTORE_EMULATOR_HOST;

const PROJECT_ID =
  process.env.FB_ADMIN_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  'onlinestoretemplate-59d3e';

console.log('Project  :', PROJECT_ID);
console.log(
  'Emulator :',
  USE_EMULATOR ? process.env.FIRESTORE_EMULATOR_HOST : 'no',
);
console.log('Overwrite:', OVERWRITE);

if (USE_EMULATOR) {
  // No real credentials needed when pointing at the local emulator.
  admin.initializeApp({ projectId: PROJECT_ID });
} else {
  const privateKey = (process.env.FB_ADMIN_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n')
    .replace(/^"|"$/g, '');

  console.log('Email    :', process.env.FB_ADMIN_CLIENT_EMAIL);
  console.log('Key ok   :', privateKey.startsWith('-----BEGIN'));

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: PROJECT_ID,
      clientEmail: process.env.FB_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
    projectId: PROJECT_ID,
  });
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

const now = admin.firestore.FieldValue.serverTimestamp();
const SYSTEM = { uid: 'system', name: 'Seed Script' };
const meta = {
  createdBy: SYSTEM,
  updatedBy: SYSTEM,
  createdAt: now,
  updatedAt: now,
};

// ── Categories ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'cat-apparel',
    name: 'Apparel',
    description: 'Clothing and wearables for every occasion',
  },
  {
    id: 'cat-accessories',
    name: 'Accessories',
    description: 'Bags, belts, scarves, and finishing touches',
  },
  {
    id: 'cat-footwear',
    name: 'Footwear',
    description: 'Shoes, boots, and sandals for every step',
  },
  {
    id: 'cat-home',
    name: 'Home & Living',
    description: 'Decor and home goods to elevate your space',
  },
  {
    id: 'cat-beauty',
    name: 'Beauty & Care',
    description: 'Skincare, haircare, and personal wellness',
  },
  {
    id: 'cat-sports',
    name: 'Sports & Outdoors',
    description: 'Activewear and gear for an active lifestyle',
  },
];

// ── Products ──────────────────────────────────────────────────────────────────
const PRODUCTS = [
  // Apparel
  {
    id: 'prod-001',
    name: 'Classic White Tee',
    description:
      'A comfortable everyday white t-shirt made from 100% organic cotton.',
    price: 89,
    stock: 150,
    categoryId: 'cat-apparel',
    images: [],
    order: 1,
  },
  {
    id: 'prod-002',
    name: 'Slim Fit Jeans',
    description:
      'Modern slim fit jeans in dark indigo wash. Stretch denim for all-day comfort.',
    price: 249,
    stock: 80,
    categoryId: 'cat-apparel',
    images: [],
    order: 2,
  },
  {
    id: 'prod-003',
    name: 'Linen Summer Dress',
    description:
      'Breezy midi dress in natural linen. Features a relaxed silhouette and side pockets.',
    price: 319,
    stock: 55,
    categoryId: 'cat-apparel',
    images: [],
    order: 3,
  },
  {
    id: 'prod-004',
    name: 'Oversized Hoodie',
    description:
      'Heavyweight cotton-fleece hoodie with a kangaroo pocket. Unisex sizing.',
    price: 219,
    stock: 100,
    categoryId: 'cat-apparel',
    images: [],
    order: 4,
  },

  // Accessories
  {
    id: 'prod-005',
    name: 'Canvas Tote Bag',
    description:
      'Sturdy canvas tote with interior zip pocket. Perfect for daily use.',
    price: 109,
    stock: 60,
    categoryId: 'cat-accessories',
    images: [],
    order: 5,
  },
  {
    id: 'prod-006',
    name: 'Leather Belt',
    description:
      'Full-grain leather belt with a brushed silver buckle. Available in black and brown.',
    price: 159,
    stock: 45,
    categoryId: 'cat-accessories',
    images: [],
    order: 6,
  },
  {
    id: 'prod-007',
    name: 'Silk Scarf',
    description:
      'Lightweight 100% silk scarf with an abstract botanical print. 90×90 cm.',
    price: 149,
    stock: 40,
    categoryId: 'cat-accessories',
    images: [],
    order: 7,
  },
  {
    id: 'prod-008',
    name: 'Aviator Sunglasses',
    description: 'Classic metal-frame aviators with UV400 polarised lenses.',
    price: 199,
    stock: 70,
    categoryId: 'cat-accessories',
    images: [],
    order: 8,
  },

  // Footwear
  {
    id: 'prod-009',
    name: 'White Sneakers',
    description:
      'Clean minimalist sneakers with a cushioned sole. Goes with everything.',
    price: 279,
    stock: 70,
    categoryId: 'cat-footwear',
    images: [],
    order: 9,
  },
  {
    id: 'prod-010',
    name: 'Chelsea Boots',
    description:
      'Ankle-height Chelsea boots in genuine leather with elastic side panels.',
    price: 469,
    stock: 35,
    categoryId: 'cat-footwear',
    images: [],
    order: 10,
  },
  {
    id: 'prod-011',
    name: 'Leather Loafers',
    description:
      'Slip-on loafers in smooth calfskin. Cushioned footbed for all-day wear.',
    price: 349,
    stock: 50,
    categoryId: 'cat-footwear',
    images: [],
    order: 11,
  },
  {
    id: 'prod-012',
    name: 'Slide Sandals',
    description: 'Minimalist single-band sandals with a contoured EVA sole.',
    price: 129,
    stock: 90,
    categoryId: 'cat-footwear',
    images: [],
    order: 12,
  },

  // Home & Living
  {
    id: 'prod-013',
    name: 'Scented Candle Set',
    description:
      'Set of 3 hand-poured soy candles: cedar, vanilla, and eucalyptus.',
    price: 139,
    stock: 90,
    categoryId: 'cat-home',
    images: [],
    order: 13,
  },
  {
    id: 'prod-014',
    name: 'Ceramic Mug',
    description:
      'Hand-thrown ceramic mug, 350 ml. Microwave and dishwasher safe.',
    price: 79,
    stock: 120,
    categoryId: 'cat-home',
    images: [],
    order: 14,
  },
  {
    id: 'prod-015',
    name: 'Linen Throw Blanket',
    description:
      'Washed linen throw in stone beige. 130×170 cm, machine washable.',
    price: 229,
    stock: 40,
    categoryId: 'cat-home',
    images: [],
    order: 15,
  },
  {
    id: 'prod-016',
    name: 'Walnut Serving Board',
    description:
      'Solid American walnut cutting and serving board with juice groove. 35×25 cm.',
    price: 189,
    stock: 30,
    categoryId: 'cat-home',
    images: [],
    order: 16,
  },

  // Beauty & Care
  {
    id: 'prod-017',
    name: 'Vitamin C Face Serum',
    description:
      '15% L-ascorbic acid brightening serum with hyaluronic acid. 30 ml.',
    price: 199,
    stock: 65,
    categoryId: 'cat-beauty',
    images: [],
    order: 17,
  },
  {
    id: 'prod-018',
    name: 'Natural Body Scrub',
    description:
      'Coffee and coconut sugar exfoliating scrub. Paraben-free. 250 g.',
    price: 99,
    stock: 80,
    categoryId: 'cat-beauty',
    images: [],
    order: 18,
  },
  {
    id: 'prod-019',
    name: 'Rose Water Toner',
    description:
      'Alcohol-free Bulgarian rose water toner to balance and hydrate skin. 150 ml.',
    price: 89,
    stock: 100,
    categoryId: 'cat-beauty',
    images: [],
    order: 19,
  },

  // Sports & Outdoors
  {
    id: 'prod-020',
    name: 'Premium Yoga Mat',
    description:
      'Non-slip natural rubber mat, 6 mm thick. Includes carry strap.',
    price: 179,
    stock: 55,
    categoryId: 'cat-sports',
    images: [],
    order: 20,
  },
  {
    id: 'prod-021',
    name: 'Running Cap',
    description:
      'Lightweight moisture-wicking running cap with an adjustable strap.',
    price: 79,
    stock: 110,
    categoryId: 'cat-sports',
    images: [],
    order: 21,
  },
  {
    id: 'prod-022',
    name: 'Insulated Water Bottle',
    description:
      'Double-wall stainless steel bottle. Keeps drinks cold 24 h / hot 12 h. 750 ml.',
    price: 149,
    stock: 85,
    categoryId: 'cat-sports',
    images: [],
    order: 22,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function upsert(col, id, data) {
  const ref = db.collection(col).doc(id);
  if (!OVERWRITE) {
    const snap = await ref.get();
    if (snap.exists) {
      console.log(`  skip      ${col}/${id}`);
      return;
    }
  }
  await ref.set(data);
  console.log(`  ${OVERWRITE ? 'overwrite' : 'write    '} ${col}/${id}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log('\n── Categories ─────────────────────────────');
    for (const cat of CATEGORIES) {
      await upsert('categories', cat.id, { ...cat, metadata: meta });
    }

    console.log('\n── Products ───────────────────────────────');
    for (const prod of PRODUCTS) {
      await upsert('products', prod.id, { ...prod, metadata: meta });
    }

    console.log(
      `\n✅ Seed complete — ${CATEGORIES.length} categories, ${PRODUCTS.length} products.\n`,
    );
    process.exit(0);
  } catch (e) {
    console.error('\n❌ Seed failed:', e.message);
    process.exit(1);
  }
})();
