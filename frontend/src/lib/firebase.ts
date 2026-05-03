import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";

const firebaseConfig = {
  apiKey:            "AIzaSyAQaLBx3gJaIv08iRQYNsHZhFrZjIU0C0E",
  authDomain:        "shippingagent2026-bbab1.firebaseapp.com",
  projectId:         "shippingagent2026-bbab1",
  storageBucket:     "shippingagent2026-bbab1.firebasestorage.app",
  messagingSenderId: "1059771888790",
  appId:             "1:1059771888790:web:23ae2c4e0e1d9cce2d3eb7",
  measurementId:     "G-VDZQ79G5MJ",
};

// Prevent duplicate init on Next.js hot reload
const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export { app, auth, googleProvider };

// ── Helpers ───────────────────────────────────────────────────────────────────
export const signInWithGoogle        = ()                          => signInWithPopup(auth, googleProvider);
export const signInWithEmail         = (e: string, p: string)     => signInWithEmailAndPassword(auth, e, p);
export const registerWithEmail       = (e: string, p: string)     => createUserWithEmailAndPassword(auth, e, p);
export const resetPassword           = (e: string)                => sendPasswordResetEmail(auth, e);
export const firebaseSignOut         = ()                          => signOut(auth);
export const onFirebaseAuthChange    = (cb: (u: FirebaseUser | null) => void) => onAuthStateChanged(auth, cb);

export type { FirebaseUser };

export const isFirebaseConfigured = (): boolean =>
  Boolean("AIzaSyAQaLBx3gJaIv08iRQYNsHZhFrZjIU0C0E");
