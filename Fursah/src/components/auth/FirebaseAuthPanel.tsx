"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { getFirebaseClientAuth } from "@/lib/firebase-client";
import type { FirebaseRole } from "@/lib/firebase-types";
import { localSignIn, localSignUp } from "@/actions/localAuth";

/**
 * Sign-in and sign-up.
 *
 * Two credential backends sit behind the same form. Where the Firebase Admin
 * credential is present, Firebase owns authentication and this posts an ID
 * token to /api/auth/session. Where it is not, `localMode` is set and the form
 * calls the local server actions instead, which store a salted password hash on
 * the User row. Previously the unconfigured case rendered nothing but "Firebase
 * configuration is missing", so a fresh checkout could not create an account.
 */
export default function FirebaseAuthPanel({
  configured,
  serverReady,
  localMode,
}: {
  configured: boolean;
  serverReady: boolean;
  localMode: boolean;
}) {
  const [mode, setMode] = useState<"signup" | "signin" | "forgot">("signin");
  const [role, setRole] = useState<FirebaseRole>("STUDENT");
  // React resets an uncontrolled form once its action resolves, so a rejected
  // sign-in wiped the address the reader had just typed and made them start
  // over. The email is held in state to survive a failed attempt; the password
  // is deliberately left uncontrolled so it is cleared.
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Firebase can only issue a session when both halves are present.
  const firebaseReady = configured && serverReady;
  const canSubmit = localMode || firebaseReady;

  function changeMode(nextMode: "signup" | "signin" | "forgot") {
    setMode(nextMode);
    setError("");
    setSuccess("");
  }

  async function submitLocal(formData: FormData) {
    formData.set("role", role);
    const result = mode === "signup" ? await localSignUp(formData) : await localSignIn(formData);
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }
    window.location.assign(result.redirectTo);
  }

  async function submitFirebase(formData: FormData) {
    const auth = getFirebaseClientAuth();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const credential = mode === "signup" ? await createUserWithEmailAndPassword(auth, email, password) : await signInWithEmailAndPassword(auth, email, password);
    if (mode === "signup") await updateProfile(credential.user, { displayName: name });
    const idToken = await credential.user.getIdToken(true);
    // Send only the profile fields that belong to the selected role, and never
    // forward a value equal to the password. Password managers and browser
    // autofill will happily drop a credential into an adjacent text input, and
    // these fields are rendered publicly on the Skills Passport.
    const profileField = (key: string) => {
      const value = String(formData.get(key) ?? "").trim();
      return value && value !== password ? value : "";
    };
    const roleFields =
      role === "STUDENT"
        ? { university: profileField("university") }
        : role === "EMPLOYER"
          ? { company: profileField("company"), industry: profileField("industry") }
          : { institution: profileField("institution"), region: profileField("region") };
    const response = await fetch("/api/auth/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken, role, name, ...roleFields }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Unable to create session");
    await signOut(auth);
    // The server decides where to land: new students go to the Skills Passport.
    window.location.assign(result.redirectTo ?? (result.role === "STUDENT" ? "/student/profile?setup=passport" : result.role === "EMPLOYER" ? "/employer/dashboard" : result.role === "ADMIN" ? "/admin/dashboard" : "/university/dashboard"));
  }

  async function submit(formData: FormData) {
    setLoading(true); setError(""); setSuccess("");
    try {
      if (localMode) await submitLocal(formData);
      else await submitFirebase(formData);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Authentication failed";
      setError(message.replace("Firebase: ", "").replace(/\(auth\/.+\)\.?/, "")); setLoading(false);
    }
  }

  async function resetPassword(formData: FormData) {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const auth = getFirebaseClientAuth();
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/login`,
      });
      setSuccess("If an account exists for this email, Firebase has sent a password reset link. Check your inbox and spam folder.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to send the reset email";
      setError(message.replace("Firebase: ", "").replace(/\(auth\/.+\)\.?/, ""));
    } finally {
      setLoading(false);
    }
  }

  if (!canSubmit) return <div className="notice">Account sign-in is unavailable: this environment has neither Firebase credentials nor local accounts enabled.</div>;
  return <section className="card auth-card"><div className="auth-switch"><button type="button" className={mode === "signin" ? "active" : ""} onClick={() => changeMode("signin")}><span>Sign in</span></button><button type="button" className={mode === "signup" ? "active" : ""} onClick={() => changeMode("signup")}><span>Create account</span></button></div><h2>{mode === "signup" ? "Create your Fursah account" : mode === "forgot" ? "Reset your password" : "Welcome back"}</h2><p className="muted">{mode === "forgot" ? "Enter the email address used for your Firebase account." : localMode ? "Create an account with your email and a password, then sign in." : "Secure email and password authentication powered by Firebase."}</p><form key={`${mode}-${role}`} action={mode === "forgot" ? resetPassword : submit} className="form-grid">
    {mode === "signup" && <><label>Account type<select className="input" value={role} onChange={event => setRole(event.target.value as FirebaseRole)}><option value="STUDENT">Student</option><option value="EMPLOYER">Employer</option><option value="UNIVERSITY">University</option></select></label><label>Full name<input className="input" name="name" autoComplete="name" required /></label></>}
    <label>Email<input className="input" type="email" name="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>{mode !== "forgot" && <label>Password<input className="input" type="password" name="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={localMode ? 8 : 6} required /><small className="muted">At least {localMode ? 8 : 6} characters.</small></label>}
    {mode === "signin" && !localMode && <button type="button" className="forgot-link" onClick={() => changeMode("forgot")}><span>Forgot password?</span></button>}
    {mode === "signup" && role === "STUDENT" && <label>University <span className="muted">(optional)</span><input className="input" name="university" type="text" autoComplete="organization" /><small className="muted">You will build your Skills Passport, then choose your major and career direction, after creating your account.</small></label>}
    {mode === "signup" && role === "EMPLOYER" && <><label>Company<input className="input" name="company" type="text" autoComplete="organization" required /></label><label>Industry<input className="input" name="industry" type="text" autoComplete="off" /></label></>}
    {mode === "signup" && role === "UNIVERSITY" && <><label>Institution<input className="input" name="institution" type="text" autoComplete="organization" required /></label><label>Region<input className="input" name="region" type="text" autoComplete="address-level1" /></label></>}
    {error && <div className="auth-error">{error}</div>}{success && <div className="auth-success" role="status">{success}</div>}<button className="button primary" disabled={loading}>{loading ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}</button>
    {mode === "forgot" && <button type="button" className="auth-back" onClick={() => changeMode("signin")}><span>← Back to sign in</span></button>}
  </form></section>;
}
