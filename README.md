[![Build CI](https://github.com/Bunder-shop/React-NestJS-FireBase-store/actions/workflows/build.yml/badge.svg)](https://github.com/Bunder-shop/React-NestJS-FireBase-store/actions/workflows/build.yml)
[![Linter CI](https://github.com/Bunder-shop/React-NestJS-FireBase-store/actions/workflows/linter.yml/badge.svg)](https://github.com/Bunder-shop/React-NestJS-FireBase-store/actions/workflows/linter.yml)

# 🛍️ Online Store — NX Monorepo

Full-stack e-commerce: NestJS API + React/Vite client + dedicated NestJS auth microservice, backed by Firebase (Auth, Firestore, Storage) and PayPal Orders REST API v2.

## 🚀 Features

- 🔐 Firebase Authentication with role-based access (`viewer`, `editor`, `admin`, `superadmin`)
- 🛒 Shopping cart + Zustand state
- 🧑‍💼 Admin dashboard (orders, products, categories, users, theme, security logs)
- 📦 Product catalog, lazy-loaded routes & images
- 💳 PayPal checkout (server-side Orders REST API v2 + webhooks)
- 📧 Transactional email via SendGrid (MJML/Handlebars templates)
- 🛰️ Sentry-backed global exception filter
- ⏱️ Per-IP rate limiting on payment endpoints
- 🗜️ Response gzip compression

## 🧱 Tech Stack

| Layer | Stack |
|---|---|
| API | NestJS 11, esbuild (dev) / webpack (prod), Sentry, Winston |
| Client | React 18, Vite 7, MUI 7, Zustand 5, React Query 5, React Router 7, react-hook-form |
| Auth MS | NestJS TCP microservice (port 4002) |
| DB | Firestore (Firebase) |
| Payments | PayPal Orders REST API v2 + `@paypal/react-paypal-js` |
| Mail | SendGrid + MJML/Handlebars |
| Tests | Vitest (unit), Jest (API e2e), Playwright (client e2e) |
| CI | GitHub Actions (build, lint, vitest, daily api-e2e) |

## 📂 Project Structure

```
apps/
├── api/                   NestJS API (port 3000)
├── auth/                  NestJS auth microservice (TCP 4002)
├── client/                React + Vite (port 5173)
├── api-e2e/               Jest API e2e tests
└── client-e2e/            Playwright client e2e tests
libs/
├── auth-client/           NestJS TCP client for the auth MS
├── email-templates/       MJML templates + Handlebars helpers
├── firebase/              Shared Firebase admin/client config
├── types/                 Shared TypeScript types
└── utils/                 Shared utilities
```

## ⚙️ Prerequisites

- Node 20+ (24 works; ignore EBADENGINE warnings from firebase-tools)
- npm 10+
- Java 17+ JDK (only needed for `emu:start:core` — Firebase emulators run on the JVM)
  - Windows: `winget install EclipseAdoptium.Temurin.17.JDK`

## 🛠️ Setup

```bash
npm install
cp apps/api/.env.example apps/api/.env   # fill in real values
```

Edit `apps/api/.env` and `apps/client/.env` (see env table below). For local dev, set `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` etc. so the API talks to the local emulators instead of production.

## 🧪 Scripts

```bash
# Start everything together (API + auth MS + client)
npm run nx:run-all-concurrently

# Or individually
npm run dev:client             # client only on :5173
npm run dev:api:nodbg          # API only on :3000
npm run dev:auth:nodbg         # auth microservice on TCP :4002

# Firebase emulators (separate terminal — requires Java)
npm run emu:start:core         # auth + firestore + storage + UI on :4000

# Seed emulators with demo data
npm run emu:seed:auth
npm run emu:seed:firestore
npm run emu:seed:storage

# Tests
npm test                       # vitest (runs against emulators)
npm run test:api:e2e           # API e2e via Jest
npm run e2e                    # Playwright client e2e
npm run lint                   # ESLint --fix

# Production build
npx nx run api:build:production
npx nx run client:build
```

## 🔑 Environment Variables

### `apps/api/.env` (server)

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | ✓ | `development` \| `production` \| `test` |
| `APP_PORT` | ✓ | API HTTP port (default 3000) |
| `API_PREFIX` | ✓ | Route prefix (default `api`) |
| `FRONTEND_ORIGIN` | ✓ | CORS allowed origin |
| `ALLOWED_ORIGINS` | – | CSV of extra CORS origins |
| `ADMIN_PROJECT_ID` | ✓ | Firebase project ID |
| `ADMIN_CLIENT_EMAIL` | ✓ | Service account email |
| `ADMIN_PRIVATE_KEY` | ✓ | Service account RSA key (escape newlines as `\n`) |
| `FB_ADMIN_PROJECT_ID` | ✓ | Same project ID — used by Firestore DI |
| `FB_ADMIN_CLIENT_EMAIL` | ✓ | Same client email |
| `FB_ADMIN_PRIVATE_KEY` | ✓ | Same private key |
| `FIRESTORE_EMULATOR_HOST` | – | Set to `127.0.0.1:8080` in dev to use the emulator |
| `FIREBASE_AUTH_EMULATOR_HOST` | – | `127.0.0.1:9099` in dev |
| `FIREBASE_STORAGE_EMULATOR_HOST` | – | `127.0.0.1:9199` in dev |
| `PAYPAL_CLIENT_ID` | for checkout | From https://developer.paypal.com/dashboard/applications/sandbox |
| `PAYPAL_CLIENT_SECRET` | for checkout | Pair with the above |
| `PAYPAL_WEBHOOK_ID` | for webhooks | From the PayPal app's webhook config |
| `PAYPAL_SANDBOX` | – | `true` (default) \| `false` |
| `SEND_PAYPAL_EMAILS_FROM_ORDERS` | – | Send receipts after capture (default `true`) |
| `SENDGRID_API_KEY` | for email | Starts with `SG.` |
| `MAIL_FROM` / `MAIL_FROM_NAME` | for email | Verified sender |
| `SENTRY_DSN` | – | Enable Sentry capture (no-op if unset) |
| `RATE_LIMIT_ENABLED` | – | `1` to force on (auto-on in production) |
| `ENABLE_TEST_ROUTES` | – | `1` exposes `/api/test/*` seed endpoints |

### `apps/client/.env` (browser-safe)

| Variable | Notes |
|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000/api` in dev |
| `VITE_FIREBASE_*` | Public Firebase client config |
| `VITE_PAYPAL_CLIENT_ID` | Same as server `PAYPAL_CLIENT_ID` (safe to expose) |

A starter template lives at [`apps/api/.env.example`](apps/api/.env.example).

## 🎭 Demo Admin Mode

Lets a portfolio reviewer explore the full admin panel in one click — no Firebase account required.

### Enabling it

```bash
# 1. Uncomment the last line in apps/client/.env:
VITE_DEMO_ADMIN=true

# 2. Start the client (API is optional — public data still loads without it)
npm run dev:client

# 3. Open http://localhost:5173/admin
#    You land directly on the admin dashboard — no login screen.
```

An orange **DEMO MODE** badge is pinned to the top-right of every admin page. The browser console also prints a styled warning so the bypass is always visible during development.

### How it works

`isDemoAdmin()` in [`apps/client/src/lib/demo-mode.ts`](apps/client/src/lib/demo-mode.ts) runs three guards. All three must pass:

1. **`import.meta.env.PROD === false`** — Vite dead-code-eliminates the entire bypass in production bundles. The code does not exist in any deployed artifact.
2. **`VITE_DEMO_ADMIN === 'true'`** — explicit opt-in; commented out by default.
3. **`hostname === 'localhost'`** — blocks activation on staging or tunnel URLs that might inherit the env var by mistake.

When active, `AuthProvider` skips all Firebase Auth listeners and injects a synthetic `{ uid: 'demo-admin', role: 'admin' }` directly into React context. CASL abilities, protected routes, and the admin UI all behave exactly as they would for a real admin.

### What demo mode cannot do

- Issue a real Firebase ID token — API endpoints that verify tokens will reject requests from the client SDK.
- Persist state across tabs or hard-reloads (no real session).
- Activate in a production build or outside `localhost`.

### Testing the checkout flow

Demo mode covers the **admin panel only**. To test the full PayPal checkout:

1. Sign up for a regular account at `/signup` (or use the emulator seed credentials).
2. Use a [PayPal sandbox buyer account](https://developer.paypal.com/dashboard/accounts) — the app always runs in sandbox mode (`PAYPAL_SANDBOX=true`).
3. Add items to cart → proceed to checkout → approve in the PayPal popup → order is captured and written to Firestore.

### Key files

| File | Role |
|---|---|
| `apps/client/src/lib/demo-mode.ts` | `isDemoAdmin()` guard + synthetic user object |
| `apps/client/src/context/AuthContext.tsx` | Bypasses Firebase listeners; injects synthetic context |
| `apps/client/src/components/ProtectedRoutes.tsx` | Short-circuits auth/admin checks in demo mode |
| `apps/client/src/components/DemoModeBadge.tsx` | Orange badge rendered in the admin layout |

---

## 💳 PayPal Checkout

Flow:

1. Browser calls `POST /api/orders/create-paypal-order` → server creates a PayPal order via OAuth2 + REST → returns `{ orderId }`.
2. Browser renders `<PayPalButtons createOrder={() => orderId} ... />`. User approves in the PayPal popup.
3. Browser calls `POST /api/orders/capture-paypal-order` → server captures the order → writes the paid order to Firestore.
4. PayPal also POSTs `PAYMENT.CAPTURE.COMPLETED` to `/api/webhooks/paypal` (signature-verified).

Endpoints are rate-limited to 10 req/min/IP in production.

## 🌐 Default Ports

| Service | URL |
|---|---|
| Client | http://localhost:5173 |
| API | http://localhost:3000/api |
| Swagger (dev only) | http://localhost:3000/docs |
| Auth microservice | tcp://127.0.0.1:4002 |
| Firestore emulator | http://127.0.0.1:8080 |
| Auth emulator | http://127.0.0.1:9099 |
| Storage emulator | http://127.0.0.1:9199 |
| Emulator UI | http://127.0.0.1:4000 |

## ⚙️ Admin Roles

Roles are stored as Firebase custom claims (`viewer` / `editor` / `admin` / `superadmin`). The `ADMINS_LIST` env var (CSV of emails) auto-promotes those addresses on first login.

To set a role manually from CLI:
```bash
npm run setRole admin@example.com
```

## 📦 Deployment

- **API**: build with `npx nx run api:build:production`, run `dist/apps/api/main.cjs` with the production `.env`. Sentry, rate limiting, and HTTPS enforcement auto-enable when `NODE_ENV=production`.
- **Client**: build with `npx nx run client:build`, deploy `dist/apps/client/` to any static host (Firebase Hosting, Vercel, S3+CloudFront, etc.).
- **Auth MS**: separate process listening on TCP 4002 (NestJS microservice).

## 🤝 Contributing

PRs target `main`. The `Build CI`, `Linter CI`, and `Vitest` workflows must pass.

## 👨‍💻 Author

Built by [Uri Khaimov](https://github.com/urikhaimov).
