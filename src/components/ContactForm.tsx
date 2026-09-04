"use client";

import { useState, type FormEvent } from "react";

type Errors = Partial<Record<"name" | "email" | "message", string>>;

const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand";

export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  function validate(data: FormData): Errors {
    const next: Errors = {};
    const name = (data.get("name") as string)?.trim();
    const email = (data.get("email") as string)?.trim();
    const message = (data.get("message") as string)?.trim();
    if (!name) next.name = "Please enter your name.";
    if (!email) next.email = "Please enter your email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Please enter a valid email address.";
    if (!message) next.message = "Please tell us what you need.";
    return next;
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const next = validate(data);
    setErrors(next);
    if (Object.keys(next).length === 0) {
      setSent(true);
      e.currentTarget.reset();
    }
  }

  if (sent) {
    return (
      <div
        role="status"
        className="rounded-xl border border-acid/40 bg-acid/5 p-6"
      >
        <h2 className="font-display text-lg font-semibold text-acid">
          Thanks, your message is ready to send
        </h2>
        <p className="mt-2 text-sm text-muted">
          This is a demo, so nothing was actually sent. On the live site this would
          reach the Octax sales team and we would reply with a fuel recommendation.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-4 text-sm font-medium text-brand hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input id="name" name="name" type="text" autoComplete="name" className={inputClass} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-err" : undefined} />
        {errors.name && (
          <p id="name-err" className="mt-1 text-xs text-brand-strong">{errors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" className={inputClass} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-err" : undefined} />
        {errors.email && (
          <p id="email-err" className="mt-1 text-xs text-brand-strong">{errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="topic" className="text-sm font-medium">
          Topic
        </label>
        <select id="topic" name="topic" className={inputClass} defaultValue="fuel-advice">
          <option value="fuel-advice">Fuel selection advice</option>
          <option value="order">Order or delivery</option>
          <option value="bulk">Bulk or trade enquiry</option>
          <option value="other">Something else</option>
        </select>
      </div>

      <div>
        <label htmlFor="message" className="text-sm font-medium">
          Message
        </label>
        <textarea id="message" name="message" rows={5} className={inputClass} aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-err" : undefined} />
        {errors.message && (
          <p id="message-err" className="mt-1 text-xs text-brand-strong">{errors.message}</p>
        )}
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-brand px-5 py-3 font-semibold text-black transition-colors hover:bg-brand-strong sm:w-auto"
      >
        Send message
      </button>
    </form>
  );
}
