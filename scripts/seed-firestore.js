/* eslint-disable */
// scripts/seed-firestore.js
// Full seed: categories, products, landing page, order settings, orders.
// Run: node scripts/seed-firestore.js
require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
  override: true,
});

const admin = require('firebase-admin');

const privateKey = (process.env.FB_ADMIN_PRIVATE_KEY || '')
  .replace(/\\n/g, '\n')
  .replace(/^"|"$/g, '');

console.log('Project :', process.env.FB_ADMIN_PROJECT_ID);
console.log('Email   :', process.env.FB_ADMIN_CLIENT_EMAIL);
console.log('Key ok  :', privateKey.startsWith('-----BEGIN'));

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FB_ADMIN_PROJECT_ID,
    clientEmail: process.env.FB_ADMIN_CLIENT_EMAIL,
    privateKey,
  }),
  projectId: process.env.FB_ADMIN_PROJECT_ID,
});

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
  { id: 'cat-apparel', name: 'Apparel', description: 'Clothing and wearables' },
  {
    id: 'cat-accessories',
    name: 'Accessories',
    description: 'Bags, belts, and more',
  },
  { id: 'cat-footwear', name: 'Footwear', description: 'Shoes and boots' },
  {
    id: 'cat-home',
    name: 'Home & Living',
    description: 'Decor and home goods',
  },
];

// ── Products ──────────────────────────────────────────────────────────────────
const PRODUCTS = [
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
    name: 'Canvas Tote Bag',
    description:
      'Sturdy canvas tote with interior pocket. Perfect for daily use.',
    price: 109,
    stock: 60,
    categoryId: 'cat-accessories',
    images: [],
    order: 3,
  },
  {
    id: 'prod-004',
    name: 'Leather Belt',
    description: 'Full-grain leather belt with brushed silver buckle.',
    price: 159,
    stock: 45,
    categoryId: 'cat-accessories',
    images: [],
    order: 4,
  },
  {
    id: 'prod-005',
    name: 'White Sneakers',
    description:
      'Clean minimalist sneakers with cushioned sole. Goes with everything.',
    price: 279,
    stock: 70,
    categoryId: 'cat-footwear',
    images: [],
    order: 5,
  },
  {
    id: 'prod-006',
    name: 'Chelsea Boots',
    description: 'Ankle-height Chelsea boots in genuine leather.',
    price: 469,
    stock: 35,
    categoryId: 'cat-footwear',
    images: [],
    order: 6,
  },
  {
    id: 'prod-007',
    name: 'Scented Candle Set',
    description:
      'Set of 3 hand-poured soy candles: cedar, vanilla, and eucalyptus.',
    price: 139,
    stock: 90,
    categoryId: 'cat-home',
    images: [],
    order: 7,
  },
  {
    id: 'prod-008',
    name: 'Ceramic Mug',
    description:
      'Hand-thrown ceramic mug, 350ml. Microwave and dishwasher safe.',
    price: 79,
    stock: 120,
    categoryId: 'cat-home',
    images: [],
    order: 8,
  },
];

// ── Landing page ──────────────────────────────────────────────────────────────
const LANDING = {
  title: 'Welcome to Bunder Shop',
  subtitle: 'Curated essentials for everyday life',
  bannerImageUrl: '/assets/banner.jpg',
  ctaButtonText: 'Shop Now',
  ctaButtonLink: '/products',
  homepageLayout: 'hero',
  sections: [
    { title: 'New Arrivals', content: 'Fresh styles added every Friday.' },
    { title: 'Free Shipping', content: 'On all orders over ₪300.' },
  ],
  bentoCards: [
    { title: 'Free shipping', body: 'On orders over ₪300' },
    { title: '24/7 support', body: "We're here anytime" },
    { title: 'Eco materials', body: 'Consciously sourced' },
    { title: '4.9 ★', body: '2,400+ reviews' },
    { title: 'New drops', body: 'Every Friday 10:00' },
    { title: 'Secure checkout', body: 'PayPal secured' },
  ],
  cards: [
    { title: 'Free shipping', body: 'On orders over ₪300' },
    { title: '24/7 support', body: "We're here anytime" },
    { title: 'Eco materials', body: 'Consciously sourced' },
    { title: '4.9 ★', body: '2,400+ reviews' },
    { title: 'New drops', body: 'Every Friday 10:00' },
    { title: 'Secure checkout', body: 'PayPal secured' },
  ],
};

// ── Order settings ────────────────────────────────────────────────────────────
const ORDER_SETTINGS = {
  shipping: 30, // ILS — free above threshold in landing copy
  taxRate: 17, // % (Israeli VAT)
  discount: 0,
  currency: 'ILS',
  updatedAt: now,
  updatedBy: SYSTEM,
};

// ── Sample orders ─────────────────────────────────────────────────────────────
// userId is a placeholder — admin panel shows all orders regardless.
const SEED_USER_ID = 'seed-user-001';
const SEED_USER_EMAIL = 'customer@example.com';

const ORDERS = [
  {
    id: 'order-001',
    userId: SEED_USER_ID,
    email: SEED_USER_EMAIL,
    status: 'delivered',
    currency: 'ILS',
    total: 338,
    totalAmount: 33800,
    ownerName: 'Dana Cohen',
    items: [
      {
        productId: 'prod-001',
        name: 'Classic White Tee',
        quantity: 2,
        price: 89,
      },
      { productId: 'prod-004', name: 'Leather Belt', quantity: 1, price: 159 },
    ],
    payment: {
      method: 'paypal',
      status: 'succeeded',
      provider: 'paypal',
      transactionId: 'PAYID-SEED001',
      currency: 'ILS',
      totalMinor: 33800,
      totalMajor: 338,
    },
    shippingAddress: {
      name: 'Dana Cohen',
      phone: '+972-50-1111111',
      address: {
        line1: '12 Herzl St',
        city: 'Tel Aviv',
        postalCode: '6100000',
        country: 'IL',
      },
    },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'order-002',
    userId: SEED_USER_ID,
    email: SEED_USER_EMAIL,
    status: 'paid',
    currency: 'ILS',
    total: 528,
    totalAmount: 52800,
    ownerName: 'Avi Levi',
    items: [
      {
        productId: 'prod-005',
        name: 'White Sneakers',
        quantity: 1,
        price: 279,
      },
      {
        productId: 'prod-002',
        name: 'Slim Fit Jeans',
        quantity: 1,
        price: 249,
      },
    ],
    payment: {
      method: 'paypal',
      status: 'succeeded',
      provider: 'paypal',
      transactionId: 'PAYID-SEED002',
      currency: 'ILS',
      totalMinor: 52800,
      totalMajor: 528,
    },
    shippingAddress: {
      name: 'Avi Levi',
      phone: '+972-52-2222222',
      address: {
        line1: '5 Rothschild Blvd',
        city: 'Tel Aviv',
        postalCode: '6688211',
        country: 'IL',
      },
    },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'order-003',
    userId: SEED_USER_ID,
    email: SEED_USER_EMAIL,
    status: 'shipped',
    currency: 'ILS',
    total: 218,
    totalAmount: 21800,
    ownerName: 'Miriam Shapiro',
    items: [
      {
        productId: 'prod-007',
        name: 'Scented Candle Set',
        quantity: 1,
        price: 139,
      },
      { productId: 'prod-008', name: 'Ceramic Mug', quantity: 1, price: 79 },
    ],
    payment: {
      method: 'paypal',
      status: 'succeeded',
      provider: 'paypal',
      transactionId: 'PAYID-SEED003',
      currency: 'ILS',
      totalMinor: 21800,
      totalMajor: 218,
    },
    shippingAddress: {
      name: 'Miriam Shapiro',
      phone: '+972-54-3333333',
      address: {
        line1: '3 Ben Yehuda St',
        city: 'Jerusalem',
        postalCode: '9414420',
        country: 'IL',
      },
    },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'order-004',
    userId: SEED_USER_ID,
    email: SEED_USER_EMAIL,
    status: 'open',
    currency: 'ILS',
    total: 469,
    totalAmount: 46900,
    ownerName: 'Yossi Bar',
    items: [
      { productId: 'prod-006', name: 'Chelsea Boots', quantity: 1, price: 469 },
    ],
    payment: {
      method: 'paypal',
      status: 'processing',
      provider: 'paypal',
      currency: 'ILS',
      totalMinor: 46900,
      totalMajor: 469,
    },
    shippingAddress: {
      name: 'Yossi Bar',
      phone: '+972-58-4444444',
      address: {
        line1: '8 Dizengoff St',
        city: 'Tel Aviv',
        postalCode: '6433210',
        country: 'IL',
      },
    },
    createdAt: now,
    updatedAt: now,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function upsert(col, id, data) {
  const ref = db.collection(col).doc(id);
  const snap = await ref.get();
  if (snap.exists) {
    console.log(`  skip  ${col}/${id}`);
  } else {
    await ref.set(data);
    console.log(`  write ${col}/${id}`);
  }
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

    console.log('\n── Landing page ───────────────────────────');
    await upsert('landingPages', 'default', LANDING);

    console.log('\n── Order settings ─────────────────────────');
    await upsert('order-settings', 'default', ORDER_SETTINGS);

    console.log('\n── Orders ─────────────────────────────────');
    for (const order of ORDERS) {
      await upsert('orders', order.id, order);
    }

    console.log('\n✅ Seed complete.\n');
    process.exit(0);
  } catch (e) {
    console.error('\n❌ Seed failed:', e.message);
    process.exit(1);
  }
})();
