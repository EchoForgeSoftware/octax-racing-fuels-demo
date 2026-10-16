"use client";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
export const botCheckEnabled = Boolean(sitekey);
declare global {
  interface Window { turnstile?: { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void }; }
}
export function useBotCheck() {
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  const reset = useCallback(() => { setToken(""); setAttempt((value) => value + 1); }, []);
  return { token, setToken, attempt, reset, pending: botCheckEnabled && !token };
}
export function BotCheck({ onToken, action }: { onToken: (token: string) => void; action: string }) {
  const target = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!sitekey || !ready || !target.current || !window.turnstile) return;
    const id = window.turnstile.render(target.current, { sitekey, action, theme: "light", size: "flexible",
      callback: (value: string) => { setFailed(false); onToken(value); },
      "expired-callback": () => onToken(""), "error-callback": () => { onToken(""); setFailed(true); } });
    return () => { window.turnstile?.remove(id); };
  }, [ready, action, onToken]);
  if (!sitekey) return null;
  return <div className="my-4">
    <Script id="octa-turnstile" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive"
      onReady={() => setReady(true)} onError={() => { onToken(""); setFailed(true); }} />
    <div ref={target} />
    {failed && <p role="alert" className="mt-2 text-xs text-flare">The security check couldn’t load. Check your connection and reload this page.</p>}
  </div>;
}
