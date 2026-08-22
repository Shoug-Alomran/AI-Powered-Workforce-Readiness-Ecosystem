"use client";

import { useActionState } from "react";
import { updateAccountCredentials, type AccountUpdateState } from "@/actions/account";

const initialState: AccountUpdateState = {};

export default function AccountSettingsForm({ email, verifiedDomain }: { email: string; verifiedDomain?: string }) {
  const [state, action, pending] = useActionState(updateAccountCredentials, initialState);
  return <form action={action} className="account-settings-form">
    <label>Email address<input className="input" type="email" name="email" defaultValue={email} required/><small>{verifiedDomain ? <>Must end in <strong>@{verifiedDomain}</strong> to remain organization-verified.</> : "Use an address you can access. A verification message may be required after changing it."}</small></label>
    <div className="account-password-grid">
      <label>New password<input className="input" type="password" name="password" minLength={8} autoComplete="new-password" placeholder="Leave blank to keep your password"/></label>
      <label>Confirm new password<input className="input" type="password" name="confirmPassword" minLength={8} autoComplete="new-password" placeholder="Repeat the new password"/></label>
    </div>
    {state.error&&<div className="auth-error" role="alert">{state.error}</div>}
    {state.success&&<div className="auth-success" role="status">{state.success}</div>}
    <button className="button primary" disabled={pending}>{pending?"Updating…":"Update account"}</button>
  </form>;
}
