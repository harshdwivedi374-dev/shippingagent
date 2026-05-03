"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { authApi } from "@/lib/api";
import { signInWithGoogle, signInWithEmail, registerWithEmail, resetPassword } from "@/lib/firebase";
import Image from "next/image";
import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
async function exchangeToken(idToken: string) {
  const res = await axios.post(`${BASE}/auth/firebase/login`, {}, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return res.data;
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="h-5 w-5 text-zinc-600 ">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="h-4 w-4 text-zinc-500 ">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="h-4 w-4 text-zinc-500 ">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

const AppleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6">
    <path fill="currentColor" d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
  </svg>
);

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    <path d="M1 1h22v22H1z" fill="none" />
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="currentColor" className="h-5 w-5 text-zinc-900 ">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router  = useRouter();
  const setAuth = useStore(s => s.setAuth);

  const [mode, setMode]               = useState<"login" | "register" | "reset">("login");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState<string | null>(null);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");

  const saveUser = (token: string) => {
    try {
      const p = JSON.parse(atob(token.split(".")[1]));
      setAuth({ id: p.sub, email: p.email, full_name: p.email, role: p.role || "operator" }, token);
      router.push("/dashboard");
    } catch { setError("Failed to parse token."); }
  };

  const handleGoogle = async () => {
    setLoading("google"); setError("");
    try {
      const result  = await signInWithGoogle();
      const idToken = await result.user.getIdToken();
      try { const t = await exchangeToken(idToken); saveUser(t.access_token); }
      catch {
        setAuth({ id: result.user.uid, email: result.user.email || "", full_name: result.user.displayName || "User", role: "operator" }, idToken);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message?.replace("Firebase: ", "") || "Google sign-in failed");
    } finally { setLoading(null); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "reset") { handleReset(); return; }
    setLoading("email"); setError("");
    try {
      const fn     = mode === "register" ? registerWithEmail : signInWithEmail;
      const result = await fn(email, password);
      const idToken = await result.user.getIdToken();
      try { const t = await exchangeToken(idToken); saveUser(t.access_token); }
      catch {
        setAuth({ id: result.user.uid, email: result.user.email || email, full_name: email.split("@")[0], role: "operator" }, idToken);
        router.push("/dashboard");
      }
    } catch (err: any) {
      const msg =
        err.code === "auth/user-not-found"          ? "No account found with this email" :
        err.code === "auth/wrong-password"           ? "Incorrect password" :
        err.code === "auth/email-already-in-use"     ? "Email already registered" :
        err.code === "auth/weak-password"            ? "Password must be at least 6 characters" :
        err.code === "auth/configuration-not-found"  ? "Enable Email/Password in Firebase Console → Authentication → Sign-in method" :
        err.message?.replace("Firebase: ", "")       || "Authentication failed";
      setError(msg);
    } finally { setLoading(null); }
  };

  const handleReset = async () => {
    setLoading("email"); setError(""); setSuccess("");
    try { await resetPassword(email); setSuccess("Reset email sent! Check your inbox."); }
    catch (err: any) { setError(err.message?.replace("Firebase: ", "") || "Failed to send reset email"); }
    finally { setLoading(null); }
  };

  const handleLocalLogin = async (e: string, p: string) => {
    setLoading("local"); setError("");
    try { const res = await authApi.login(e, p); saveUser(res.data.access_token); }
    catch (err: any) { setError(err.response?.data?.detail || "Login failed"); }
    finally { setLoading(null); }
  };

  const isLoading = loading !== null;

  return (
    <div className="min-h-screen flex bg-white ">

      {/* ── LEFT — shadcn Login ────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white ">
        <div className="w-full max-w-sm space-y-5">

          {/* ── Card ── */}
          <div className="p-6 space-y-6 bg-white  rounded-lg border border-zinc-200  shadow-lg ">

            {/* Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex p-2 bg-zinc-100  rounded-md border border-zinc-200 ">
                <UserIcon />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 ">
                  {mode === "login" ? "Welcome back" : mode === "register" ? "Create account" : "Reset password"}
                </h1>
                <p className="text-sm text-zinc-600  mt-1">
                  {mode === "login"    ? "Enter your credentials to sign in" :
                   mode === "register" ? "Fill in your details to get started" :
                                        "Enter your email to receive a reset link"}
                </p>
              </div>
            </div>

            {/* Social buttons — 3 column grid */}
            {mode !== "reset" && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: <AppleIcon />,  action: () => setError("Apple Sign-In coming soon") },
                  { icon: <GoogleIcon />, action: handleGoogle },
                  { icon: <XIcon />,      action: () => setError("X Sign-In coming soon") },
                ].map((item, index) => (
                  <button
                    key={index}
                    onClick={item.action}
                    disabled={isLoading}
                    className="flex items-center justify-center h-9 px-3 rounded-md border border-zinc-200  bg-white  hover:bg-zinc-50  hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950  disabled:opacity-50"
                  >
                    {loading === "google" && index === 1
                      ? <span className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
                      : item.icon}
                  </button>
                ))}
              </div>
            )}

            {/* OR Divider */}
            {mode !== "reset" && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-zinc-200 " />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white  px-2 text-zinc-500 ">
                    Or continue with
                  </span>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email"
                  className="text-sm font-medium leading-none text-zinc-900 ">
                  Email
                </label>
                <input
                  type="email" id="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com" required
                  className="flex h-9 w-full rounded-md border border-zinc-200  bg-white  px-3 py-5 text-sm shadow-sm transition-colors placeholder:text-zinc-500  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950  disabled:cursor-not-allowed disabled:opacity-50 text-zinc-900 "
                />
              </div>

              {mode !== "reset" && (
                <div className="space-y-2">
                  <label htmlFor="password"
                    className="text-sm font-medium leading-none text-zinc-900 ">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"} id="password" value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password" required
                      className="flex h-9 w-full rounded-md border border-zinc-200  bg-white  px-3 py-5 pr-10 text-sm shadow-sm transition-colors placeholder:text-zinc-500  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950  disabled:cursor-not-allowed disabled:opacity-50 text-zinc-900 "
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
              )}

              {/* Error / Success */}
              {error && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-xs text-green-600 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md px-3 py-2">
                  {success}
                </p>
              )}

              <button type="submit"
                disabled={isLoading || !email || (mode !== "reset" && !password)}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950  disabled:pointer-events-none disabled:opacity-50 bg-zinc-900 text-zinc-50 shadow hover:bg-zinc-900/90    h-9 px-4 py-2 w-full">
                {loading === "email"
                  ? <span className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-100 dark:border-t-zinc-900 rounded-full animate-spin" />
                  : mode === "reset" ? "Send Reset Email"
                  : mode === "register" ? "Create Account"
                  : "Sign In"}
              </button>
            </form>

            {/* Footer links */}
            <div className="text-center space-y-2">
              {mode === "login" ? (
                <>
                  <p className="text-sm text-zinc-600 ">
                    Don&apos;t have an account?{" "}
                    <button onClick={() => { setMode("register"); setError(""); }}
                      className="font-medium text-zinc-900  underline underline-offset-4 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                      Sign up
                    </button>
                  </p>
                  <button onClick={() => { setMode("reset"); setError(""); }}
                    className="text-sm font-medium text-zinc-900  underline underline-offset-4 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                    Forgot your password?
                  </button>
                </>
              ) : (
                <button onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                  className="text-sm font-medium text-zinc-900  underline underline-offset-4 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                  ← Back to sign in
                </button>
              )}
            </div>
          </div>

          {/* Demo accounts — below card */}
          <div className="space-y-2">
            <p className="text-xs text-center text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">
              Demo accounts
            </p>
            {[
              { role: "Admin",  e: "admin@agenticshipping.com", p: "Admin1234"  },
              { role: "Vendor", e: "vendor@fastship.com",        p: "Vendor1234" },
            ].map(({ role, e, p }) => (
              <button key={role} type="button"
                onClick={() => handleLocalLogin(e, p)} disabled={isLoading}
                className="w-full text-left flex items-center justify-between px-4 py-2.5 rounded-md border border-zinc-200  bg-white  hover:bg-zinc-50  transition-colors disabled:opacity-50">
                <div>
                  <p className="text-sm font-medium text-zinc-900 ">{role}</p>
                  <p className="text-xs font-mono text-zinc-500 ">{e}</p>
                </div>
                {loading === "local"
                  ? <span className="w-3.5 h-3.5 border border-zinc-400 border-t-zinc-700 rounded-full animate-spin" />
                  : <span className="text-xs text-zinc-400">click to sign in</span>}
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-zinc-500 dark:text-zinc-600">
            Vendor portal?{" "}
            <a href="/vendor/login"
              className="font-medium text-zinc-900  underline underline-offset-4 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              Sign in here →
            </a>
          </p>
        </div>
      </div>

      {/* ── RIGHT — Vector Illustration ───────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden bg-zinc-50  border-l border-zinc-200 ">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)]" />
        <div className="relative w-full h-full flex items-center justify-center p-12">
          <div className="rounded-3xl overflow-hidden w-full shadow-xl shadow-black/10 dark:shadow-black/40 border border-zinc-200 ">
            <Image
              src="/admin-avatar.jpg"
              alt="AI Shipping Illustration"
              width={900} height={600}
              className="w-full h-auto object-contain block"
              priority
            />
          </div>
        </div>
      </div>

    </div>
  );
}
