# Firebase Auth Setup — 3 Steps

## Step 1 — Enable Auth Providers in Firebase Console

1. Go to https://console.firebase.google.com
2. Select project: **shippingagent2026-bbab1**
3. Left sidebar → **Authentication** → **Sign-in method**
4. Enable these providers:

| Provider | Steps |
|---|---|
| **Email/Password** | Click → Enable → Save |
| **Google** | Click → Enable → add your email as support email → Save |

---

## Step 2 — Add Authorized Domains

Still in Authentication → **Settings** → **Authorized domains**

Add:
- `localhost`
- your production domain when deploying

---

## Step 3 — Backend Service Account (for token verification)

1. Firebase Console → Project Settings (gear icon) → **Service accounts**
2. Click **Generate new private key** → Download JSON
3. Save the file as `firebase-service-account.json` in the project root
4. The `.env` already points to it:
   ```
   FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
   ```

---

## That's it — Auth is live

| Method | How it works |
|---|---|
| **Google Sign-In** | Popup → Firebase → backend JWT |
| **Email/Password** | Firebase creates account → backend JWT |
| **Forgot Password** | Firebase sends reset email automatically |
| **Demo accounts** | Local JWT (no Firebase needed) |
