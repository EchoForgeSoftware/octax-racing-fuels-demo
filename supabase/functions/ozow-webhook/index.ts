import { CheckoutError, verifiedOutcome, verifyWebhook } from "../_shared/payment.ts";
import { database, required } from "../_shared/runtime.ts";
import { recordPayment } from "../_shared/live.ts";

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response("Use POST", { status: 405 });
  try {
    const raw = await request.text();
    if (raw.length > 64000) return new Response("Too large", { status: 413 });
    if (!await verifyWebhook(raw, request.headers, required("OZOW_WEBHOOK_SECRET"))) {
      console.warn("Ozow webhook signature rejected");
      return new Response("Invalid signature", { status: 401 });
    }
    const event = JSON.parse(raw);
    if (event.type !== "transaction.complete") return new Response(null, { status: 200 });
    const ref = event.data?.TransactionReference;
    if (typeof ref !== "string") return new Response("Full transaction notification required", { status: 400 });
    const db = database();
    const { data, error } = await db.from("ozow_payments").select("ref,environment,request_payload").eq("ref", ref).maybeSingle();
    if (error) return new Response("Please retry", { status: 503 });
    // Other sites using the same merchant client can produce unrelated events.
    if (!data) return new Response(null, { status: 200 });
    const result = verifiedOutcome(event, { ref: data.ref, total: Number(data.request_payload.amount.value),
      siteCode: data.request_payload.siteCode, environment: data.environment });
    if (result) {
      const update = await db.rpc("record_ozow_result", { p_ref: ref, p_transaction_id: result.transactionId, p_status: result.status });
      if (update.error) return new Response("Please retry", { status: 503 });
      // Mark the back-office invoice paid as well.
      if (result.status === "paid") await recordPayment(db, ref, Number(data.request_payload.amount.value), result.transactionId);
    }
    return new Response(null, { status: 200 });
  } catch (error) {
    console.warn("Ozow webhook could not be applied");
    return new Response("Notification not accepted", { status: error instanceof CheckoutError ? error.status : 503 });
  }
});
