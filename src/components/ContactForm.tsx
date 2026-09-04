"use client";

import { useState, type FormEvent } from "react";

type Errors = Partial<Record<"name" | "email" | "message", string>>;

const inputClass =
  "mt-1.5 w-full border-2 border-ink bg-panel px-3 py-2.5 text-sm outline-none focus:bg-lime/20";
const labelClass = "kicker text-ink-soft";

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
        className="border-2 border-ink bg-lime p-6"
      >
        <h2 className="font-display text-xl uppercase text-ink">
          Message ready to send
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          This is a demo, so nothing was actually sent. On the live site this would
          reach the Octax sales team and we would reply with a fuel recommendation.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="kicker mt-4 inline-block border-b-2 border-ink pb-1 hover:text-flare"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="name" className={labelClass}>
          Name
        </label>
        <input id="name" name="name" type="text" autoComplete="name" className={inputClass} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-err" : undefined} />
        {errors.name && (
          <p id="name-err" className="mt-1 font-mono text-xs text-flare">{errors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" className={inputClass} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-err" : undefined} />
        {errors.email && (
          <p id="email-err" className="mt-1 font-mono text-xs text-flare">{errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="topic" className={labelClass}>
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
        <label htmlFor="message" className={labelClass}>
          Message
        </label>
        <textarea id="message" name="message" rows={5} className={inputClass} aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-err" : undefined} />
        {errors.message && (
          <p id="message-err" className="mt-1 font-mono text-xs text-flare">{errors.message}</p>
        )}
      </div>

      <button
        type="submit"
        className="w-full border-2 border-ink bg-flare px-6 py-3.5 font-display uppercase text-paper transition-colors hover:bg-ink sm:w-auto"
      >
        Send message
      </button>
    </form>
  );
}
