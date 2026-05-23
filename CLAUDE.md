# shop — NX 21 Monorepo Online Store

## Architecture

NX 21.6.2 monorepo. Full-stack e-commerce platform with a separate auth microservice.

### Apps

| App | Stack | Notes |
|-----|-------|-------|
| `apps/api` | NestJS 11, esbuild (dev) / webpack (prod) | Main backend |
| `apps/client` | React 18, Vite | Main frontend |
| `apps/client-e2e` | Playwright | Frontend e2e tests |
| `apps/api-e2e` | Jest | API e2e tests |

### Libs

| Lib | Purpose |
|-----|---------|
| `libs/auth-client` | NestJS TCP microservice client — connects to auth service on port 4002 |
| `libs/types` | Shared TypeScript types (products, orders, users, auth, theme, landing, etc.) |
| `libs/firebase` | Firebase config and utilities |
| `libs/utils` | Shared utilities |
| `libs/email-templates` | MJML email templates |

## Tech Stack

**Backend (api):** NestJS 11, Firebase Admin + Firestore, PayPal Orders REST API v2, SendGrid, nodemailer, nestjs-i18n, CASL, Sentry, Winston, Swagger.

**Frontend (client):** React 18, MUI v7 + Emotion, React Router v7, React Query v5, Zustand v5, i18next, Framer Motion, CASL, react-hook-form + Zod/Yup, dnd-kit, @paypal/react-paypal-js.

**Database:** Firestore (Firebase).

**Payments:** PayPal Orders REST API v2. Flow: frontend calls `POST /orders/create-paypal-order` → gets `orderId` → PayPalButtons approve → frontend calls `POST /orders/capture-paypal-order`. Webhooks at `/api/webhooks/paypal`.

**Auth:** Firebase Auth + separate NestJS auth microservice (TCP, port 4002).

**Styling:** Less (CSS preprocessor), MUI Emotion for components.

## Dev Commands

```bash
# Run individual apps
npm run dev:client               # client only
npm run dev:api:nodbg            # api only (no debugger)
npm run dev:api:dbg              # api with debugger on port 9231

# Run all together
npm run nx:run-all-concurrently  # api + auth ms + client via concurrently

# Firebase emulators
npm run emu:start:core           # auth, firestore, storage (with import/export)
npm run emu:start:full           # + functions, hosting

# Seeding
npm run emu:seed:auth
npm run emu:seed:firestore
npm run emu:seed:storage
```

## Testing

```bash
# Unit tests (Vitest, runs against Firebase emulators)
npm test

# Firestore security rules only
npm run test:rules

# API e2e (Jest)
npm run test:api:e2e

# Frontend e2e (Playwright)
npm run e2e

# Smoke tests
npm run smoke:all
```

- Unit tests use Vitest with Firebase emulators via `firebase emulators:exec`.
- API e2e uses Jest (`apps/api/test/jest-e2e.js`) with `--runInBand`.
- Frontend e2e uses Playwright (`apps/client-e2e/playwright.config.ts`).

## API Modules

`auth`, `products`, `orders`, `users`, `categories`, `landing-page`, `theme-settings`, `security-logs`, `search`, `mailer`, `stripe`, `image-proxy`, `health`, `dev` (dev-only), `test` (test-only, behind `ENABLE_TEST_ROUTES=1`).

## Key Env Vars

- `NODE_ENV` — `development` | `production` | `test`
- `ENABLE_TEST_ROUTES=1` — enables `/test/*` seed endpoints
- `RATE_LIMIT_ENABLED=1` — enables rate limiting on create-paypal-order endpoint
- `GCLOUD_PROJECT` / `GOOGLE_CLOUD_PROJECT` — Firebase project ID (`onlinestoretemplate-59d3e`)
- `FIREBASE_AUTH_EMULATOR_HOST`, `FIRESTORE_EMULATOR_HOST`, `STORAGE_EMULATOR_HOST` — emulator endpoints

### PayPal env vars (backend — `apps/api/.env`)
- `PAYPAL_CLIENT_ID` — PayPal app client ID
- `PAYPAL_CLIENT_SECRET` — PayPal app client secret
- `PAYPAL_WEBHOOK_ID` — webhook ID from PayPal dashboard (for signature verification)
- `PAYPAL_SANDBOX=true` — `false` in production (defaults to `true`)
- `SEND_PAYPAL_EMAILS_FROM_ORDERS=true` — send receipt emails after capture

### PayPal env vars (frontend — `apps/client/.env`)
- `VITE_PAYPAL_CLIENT_ID` — same client ID (safe to expose; used by PayPal JS SDK)
