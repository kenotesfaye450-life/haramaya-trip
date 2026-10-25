"use client";

import { loginAction, registerAction } from "@/lib/actions/auth";
import { Alert, Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/form-status";
import { useActionState } from "react";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-4">
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Field label="Email">
        <input className={inputClass} name="email" type="email" required autoComplete="email" autoFocus />
      </Field>
      <Field label="Password">
        <input className={inputClass} name="password" type="password" required autoComplete="current-password" />
      </Field>
      <SubmitButton>Sign in</SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, null);
  return (
    <form action={action} className="space-y-4">
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Field label="Full name">
        <input className={inputClass} name="fullName" required autoComplete="name" autoFocus />
      </Field>
      <Field label="Email">
        <input className={inputClass} name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Phone">
        <input className={inputClass} name="phone" autoComplete="tel" />
      </Field>
      <Field label="Password" hint="At least 8 characters.">
        <input className={inputClass} name="password" type="password" required autoComplete="new-password" />
      </Field>
      <SubmitButton>Create account</SubmitButton>
    </form>
  );
}
