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
import { CAREER_TRACKS } from "@/lib/careerTracks";
import Link from "next/link";

export default function FirebaseAuthPanel({ configured, serverReady }: { configured: boolean; serverReady: boolean }) {
  const [mode, setMode] = useState<"signup" | "signin" | "forgot">("signin");
  const [role, setRole] = useState<FirebaseRole>("STUDENT");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function changeMode(nextMode: "signup" | "signin" | "forgot") {
    setMode(nextMode);
    setError("");
    setSuccess("");
  }

  async function submit(formData: FormData) {
    setLoading(true); setError(""); setSuccess("");
    try {
      const auth = getFirebaseClientAuth();
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const password = String(formData.get("password") ?? "");
      const name = String(formData.get("name") ?? "").trim();
      const credential = mode === "signup" ? await createUserWithEmailAndPassword(auth, email, password) : await signInWithEmailAndPassword(auth, email, password);
      if (mode === "signup") await updateProfile(credential.user, { displayName: name });
      const idToken = await credential.user.getIdToken(true);
      const response = await fetch("/api/auth/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken, role, name, targetCareer: formData.get("targetCareer"), university: formData.get("university"), company: formData.get("company"), industry: formData.get("industry"), institution: formData.get("institution"), region: formData.get("region") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to create session");
      await signOut(auth);
      window.location.assign(result.role === "STUDENT" ? "/student/dashboard" : result.role === "EMPLOYER" ? "/employer/dashboard" : result.role === "ADMIN" ? "/admin/dashboard" : "/university/dashboard");
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

  if (!configured) return <div className="notice">Firebase configuration is missing.</div>;
  return <section className="card auth-card"><div className="auth-switch"><button type="button" className={mode === "signin" ? "active" : ""} onClick={() => changeMode("signin")}><span data-i18n="auth.signin">Sign in</span></button><button type="button" className={mode === "signup" ? "active" : ""} onClick={() => changeMode("signup")}><span data-i18n="auth.signup">Create account</span></button></div><h2 data-i18n={mode === "signup" ? "auth.create" : mode === "forgot" ? "auth.reset" : "auth.welcome"}>{mode === "signup" ? "Create your Fursah account" : mode === "forgot" ? "Reset your password" : "Welcome back"}</h2><p className="muted" {...(mode !== "forgot" ? {"data-i18n":"auth.secure"} : {})}>{mode === "forgot" ? "Enter the email address used for your Firebase account." : "Secure email and password authentication powered by Firebase."}</p><form action={mode === "forgot" ? resetPassword : submit} className="form-grid">
    {mode === "signup" && <><label>Account type<select className="input" value={role} onChange={event => setRole(event.target.value as FirebaseRole)}><option value="STUDENT">Student</option><option value="EMPLOYER">Employer</option><option value="UNIVERSITY">University</option></select></label><label>Full name<input className="input" name="name" required /></label></>}
    <label>Email<input className="input" type="email" name="email" autoComplete="email" required /></label>{mode !== "forgot" && <label>Password<input className="input" type="password" name="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={6} required /><small className="muted">At least 6 characters.</small></label>}
    {mode === "signin" && <button type="button" className="forgot-link" onClick={() => changeMode("forgot")}><span data-i18n="auth.forgot">Forgot password?</span></button>}
    {mode === "signup" && role === "STUDENT" && <><label>Target career<select className="input" name="targetCareer">{CAREER_TRACKS.map(track => <option value={track.id} key={track.id}>{track.label}</option>)}</select></label><label>University<input className="input" name="university" /></label></>}
    {mode === "signup" && role === "EMPLOYER" && <><label>Company<input className="input" name="company" required /></label><label>Industry<input className="input" name="industry" /></label></>}
    {mode === "signup" && role === "UNIVERSITY" && <><label>Institution<input className="input" name="institution" required /></label><label>Region<input className="input" name="region" /></label></>}
    {mode !== "forgot" && !serverReady && <div className="notice">Secure account sign-in is waiting for the Firebase Admin credential. You can still use a prepared account below.</div>}{error && <div className="auth-error">{error}</div>}{success && <div className="auth-success" role="status">{success}</div>}<button className="button primary" disabled={loading || (mode !== "forgot" && !serverReady)}>{loading ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}</button>{mode !== "forgot"&&!serverReady&&<Link className="button secondary" href="/login/demo">Choose a prepared account</Link>}
    {mode === "forgot" && <button type="button" className="auth-back" onClick={() => changeMode("signin")}><span data-i18n="auth.back">← Back to sign in</span></button>}
  </form></section>;
}
