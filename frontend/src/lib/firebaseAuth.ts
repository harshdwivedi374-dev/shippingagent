/**
 * Firebase ↔ Backend bridge.
 * After Firebase signs the user in, exchange the Firebase ID token
 * for a backend JWT so all API calls work normally.
 */
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/**
 * Exchange a Firebase ID token for a backend JWT.
 * Returns { access_token, refresh_token } on success.
 */
export async function exchangeFirebaseToken(firebaseIdToken: string) {
  const res = await axios.post(
    `${BASE}/auth/firebase/login`,
    {},
    { headers: { Authorization: `Bearer ${firebaseIdToken}` } }
  );
  return res.data as { access_token: string; refresh_token: string; token_type: string };
}

/**
 * Full Firebase sign-in flow:
 * 1. Sign in with Firebase (Google popup or email/password)
 * 2. Get Firebase ID token
 * 3. Exchange for backend JWT
 * 4. Return both tokens + Firebase user info
 */
export async function firebaseLoginAndGetBackendToken(
  signInFn: () => Promise<any>
) {
  const result = await signInFn();
  const user = result.user;
  const idToken = await user.getIdToken();
  const backendTokens = await exchangeFirebaseToken(idToken);

  return {
    firebaseUser: user,
    idToken,
    ...backendTokens,
  };
}

/**
 * Refresh the backend JWT using the current Firebase session.
 * Call this when the backend JWT expires (every 60 min by default).
 */
export async function refreshBackendToken(): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  try {
    const idToken = await currentUser.getIdToken(true); // force refresh
    const tokens = await exchangeFirebaseToken(idToken);
    return tokens.access_token;
  } catch {
    return null;
  }
}
