[![Build CI](https://github.com/Bunder-shop/React-NestJS-FireBase-store/actions/workflows/build.yml/badge.svg)](https://github.com/Bunder-shop/React-NestJS-FireBase-store/actions/workflows/build.yml)
[![Linter CI](https://github.com/Bunder-shop/React-NestJS-FireBase-store/actions/workflows/linter.yml/badge.svg)](https://github.com/Bunder-shop/React-NestJS-FireBase-store/actions/workflows/linter.yml)

# 🛍️ My Online Store Template

A modern e-commerce web app built with **React + Vite**, styled using **Material UI**, and powered by **Firebase** for authentication, Firestore, and Cloud Functions.

## 🚀 Features

- 🔐 Firebase Authentication with Role-Based Access
- 🛒 Shopping Cart with Zustand Global Store
- 🧑‍💼 Admin Dashboard with Logs, User Management, and Category Management
- 📦 Product Detail Pages
- 💳 Stripe Checkout Integration (Test Key)
- 🔄 Zustand for State Management
- 📊 Firebase Functions for Admin Role Assignment

## 🧱 Tech Stack

- React 19 + Vite
- TypeScript
- Material UI 5
- Zustand (State Management)
- Firebase (Auth, Firestore, Functions)
- Stripe (Client Integration)
- React Router v6

## 📂 Project Structure

```
src/
├── api/                # Firebase API functions
├── components/         # UI components
├── context/            # Legacy (now replaced with Zustand)
├── hooks/              # Custom hooks
├── layouts/            # Main Layouts
├── pages/              # Route Pages
├── stores/             # Zustand state stores
├── types/              # Shared TS types
├── utils/              # Utility functions
functions/              # Firebase Functions & Role Scripts
public/                 # Static files
```

## 🧪 Scripts

```bash
npm install              # Install dependencies
npm run dev              # Start local dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run setRole <email>  # Manually assign admin role via Firebase Admin SDK
```

## 📝 .env Example

```env
# Firebase client config
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...

# Stripe public key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
```

## ⚙️ Admin Role Management

Firebase Admin SDK script to assign roles manually:
```bash
npm run setRole admin@example.com
```

Make sure you have `serviceAccountKey.json` in the `functions/` folder.

## 📦 Deployment

You can deploy with Firebase Hosting + Functions:
```bash
firebase deploy --only "functions,hosting"
```

## 👨‍💻 Author

Built by [Uri Khaimov](https://github.com/urikhaimov)
