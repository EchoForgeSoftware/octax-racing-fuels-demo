import catalogue from "../_shared/catalogue.json" with { type: "json" };
import { CheckoutError, quoteCart, sha256, trustedRedirect, validateCapability, validateCustomer } from "../_shared/payment.ts";
import { database, requestOzow, settings } from "../_shared/runtime.ts";
import { verifyBot } from "../_shared/bot.ts";

Deno.serve(async (request: Request) => {
  let headers: Record<string, string> = { "Content-Type": "application/json", "Cache-Control": "no-store", Vary: "Origin" };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  try {
    const config = settings();
    const origin = request.headers.get("origin");
    if (!origin || !config.origins.includes(origin)) return reply({ error: "Checkout origin is not allowed." }, 403);
    headers = { ...headers, "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS" };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return reply({ error: "Use POST." }, 405);
    const raw = await request.text();
    if (raw.length > 20000) return reply({ error: "Checkout request is too large." }, 413);
    const body = JSON.parse(raw);
    validateCapability(body.ref, body.checkoutToken);
    if (!["create", "status"].includes(body.action)) return reply({ error: "Unknown checkout action." }, 400);
    if (body.action === "create" && Deno.env.get("OZOW_ENABLED") !== "true") throw new CheckoutError("Ozow payments are not open yet.", 503);
    if (body.action === "create" && (body.termsAccepted !== true || body.termsVersion !== catalogue.termsVersion)) throw new CheckoutError("Please read and agree to the current terms before paying.");
    const db = database();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const bucket = await sha256(`${ip}:${body.action}`);
    const limit = await db.rpc("ozow_take_rate_limit", { p_bucket: bucket, p_max: body.action === "create" ? 10 : 60 });
    if (limit.error) throw new CheckoutError("Checkout is unavailable. Please try again.", 503);
    if (!limit.data) return reply({ error: "Too many requests. Please wait a minute and try again." }, 429);
    const checkoutHash = await sha256(body.checkoutToken);

    if (body.action === "status") {
      const { data, error } = await db.from("ozow_payments").select("status,environment").eq("ref", body.ref).eq("checkout_hash", checkoutHash).maybeSingle();
      if (error) throw new CheckoutError("We couldn't check your payment. Please try again.", 503);
      if (!data) return reply({ error: "Payment reference not found in this session." }, 404);
      return reply({ status: data.status, testMode: data.environment === "staging" });
    }

    const botSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (config.environment === "production" && !botSecret) throw new CheckoutError("Payment security is not configured yet.", 503);
    if (botSecret) await verifyBot(body.captchaToken, botSecret, config.origins);

    let userId: string | null = null;
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    // Supabase's public anon JWT can appear here for guests. A real session
    // token must be verified; its subject is never read without verification.
    if (bearer && bearer !== Deno.env.get("SUPABASE_ANON_KEY")) {
      const { data, error } = await db.auth.getUser(bearer);
      if (error || !data.user) return reply({ error: "Your session expired. Sign in again, or sign out to order as a guest." }, 401);
      userId = data.user.id;
    }
    const customer = validateCustomer(body.customer);
    const quote = quoteCart(body.items, catalogue, customer.city);
    if (typeof body.expectedTotal !== "number" || !Number.isFinite(body.expectedTotal) || Math.round(body.expectedTotal * 100) !== Math.round(quote.total * 100)) {
      throw new CheckoutError("The order total has changed. Refresh your cart before starting payment.", 409);
    }
    const order = { ref: body.ref, user_id: userId, customer, ...quote, terms_version: catalogue.termsVersion };
    const requestHash = await sha256(JSON.stringify({ userId, customer, items: quote.items.map(({ sku, qty }) => ({ sku, qty })), termsVersion: catalogue.termsVersion }));
    const paymentRequest = {
      siteCode: config.siteCode, region: "ZA", amount: { currency: "ZAR", value: quote.total }, merchantReference: body.ref,
      beneficiaryReference: body.ref.replaceAll("-", ""), expireAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      returnUrl: `${config.siteUrl}/checkout/ozow/`,
    };
    const reserved = await db.rpc("reserve_ozow_order", { p_order: order, p_request: paymentRequest,
      p_checkout_hash: checkoutHash, p_request_hash: requestHash, p_environment: config.environment });
    if (reserved.error || !reserved.data) throw new CheckoutError("We couldn't reserve this order. Retry with the same cart, or reload checkout if you've changed it.", 409);
    const payment = reserved.data;
    if (Math.round(Number(payment.order.total) * 100) !== Math.round(body.expectedTotal * 100)) throw new CheckoutError("An existing payment has a different total. Check its status before starting another payment.", 409);
    if (payment.status === "paid") throw new CheckoutError("This order is already paid. Open your payment confirmation.", 409);
    if (Date.parse(payment.request_payload.expireAt) <= Date.now()) throw new CheckoutError("This payment link has expired. Please contact us with your order reference before starting another payment.", 409);
    let redirectUrl = payment.redirect_url;
    if (!redirectUrl) {
      const result = await requestOzow(config, "/payments", payment.request_payload, payment.ref);
      redirectUrl = trustedRedirect(result.redirectUrl, config.environment);
      if (typeof result.id !== "string" || !/^[a-f0-9-]{36}$/i.test(result.id)) throw new CheckoutError("Ozow returned an invalid payment reference.", 502);
      const updated = await db.from("ozow_payments").update({ payment_id: result.id, redirect_url: redirectUrl }).eq("ref", payment.ref);
      if (updated.error) throw new CheckoutError("We couldn't confirm the payment link. Please retry with the same order.", 503);
    }
    redirectUrl = trustedRedirect(redirectUrl, config.environment);
    const saved = payment.order;
    return reply({ redirectUrl, order: { ref: saved.ref, items: saved.items, subtotal: saved.subtotal, courier: saved.courier, total: saved.total,
      name: saved.customer.name, email: saved.customer.email, placedAt: saved.created_at } });
  } catch (error) {
    if (error instanceof CheckoutError) return reply({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return reply({ error: "Invalid checkout request." }, 400);
    console.error("Ozow checkout request failed");
    return reply({ error: "We couldn't prepare your payment. Your cart has been kept. Please try again." }, 503);
  }
});
