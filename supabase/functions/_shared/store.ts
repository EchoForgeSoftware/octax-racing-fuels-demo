// Back-office records in the database, for the Edge Functions (service role).
// Shared by "backoffice", "ozow-checkout" and "ozow-webhook".
import type { Row, Store } from "./app/backoffice/server.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

export function backofficeStore(db: Db): Store {
  return {
    async load(collections) {
      const { data, error } = await db.rpc("bo_store_load", { p_collections: collections ?? null });
      if (error) throw new Error("load failed");
      return { version: Number(data.version), rows: data.rows ?? {} };
    },
    async commit(version, upserts: Row[], deletes, audit) {
      const { data, error } = await db.rpc("bo_store_commit", {
        p_version: version, p_upserts: upserts, p_deletes: deletes, p_actor: audit.actor, p_operation: audit.operation, p_details: audit.details,
      });
      if (error) throw new Error("commit failed");
      return data !== null;
    },
    async staff(userId) {
      const { data, error } = await db.from("bo_staff").select("display_name,role,active").eq("user_id", userId).maybeSingle();
      if (error) throw new Error("staff lookup failed");
      return data;
    },
    async claimInvite(userId, email) {
      const { data, error } = await db.rpc("bo_claim_staff_invite", { p_user: userId, p_email: email });
      if (error) throw new Error("invite failed");
      return data;
    },
    async file(id) {
      const { data, error } = await db.from("bo_store").select("data").eq("collection", "file").eq("id", id).maybeSingle();
      if (error) throw new Error("file failed");
      return data?.data ?? null;
    },
    async insertOrder(row) {
      // A retry with the same reference keeps the first order (ignoreDuplicates).
      const { error } = await db.from("orders").upsert(row, { onConflict: "ref", ignoreDuplicates: true });
      if (!error) return null;
      return /terms/i.test(error.message ?? "") ? "Please refresh the page and accept the current terms." : "We couldn't save your order. Your cart has been kept. Please try again.";
    },
  };
}
