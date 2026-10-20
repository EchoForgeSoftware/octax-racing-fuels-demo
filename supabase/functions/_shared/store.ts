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
    async listStaff() {
      const { data, error } = await db.from("bo_staff").select("user_id,display_name,role,active").order("display_name");
      if (error) throw new Error("staff list failed");
      return Promise.all((data ?? []).map(async (row: { user_id: string; display_name: string; role: string; active: boolean }) => {
        const { data: found } = await db.auth.admin.getUserById(row.user_id);
        return { ...row, email: found?.user?.email ?? null };
      }));
    },
    async saveStaff(userId, name, role, active) {
      const { error } = await db.from("bo_staff").upsert({ user_id: userId, display_name: name, role, active }, { onConflict: "user_id" });
      if (error) throw new Error("staff save failed");
    },
    async ensureLogin(email, password) {
      const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
      if (!created.error && created.data?.user) return { id: created.data.user.id };
      // Already registered (for example stuck waiting for a confirmation email): confirm it and set the password.
      if (!/already|registered|exists/i.test(created.error?.message ?? "")) return { error: `The login couldn't be created: ${created.error?.message ?? "unknown error"}` };
      for (let page = 1; page <= 20; page++) {
        const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) break;
        const found = data.users.find((u: { email?: string }) => u.email?.toLowerCase() === email);
        if (found) {
          const updated = await db.auth.admin.updateUserById(found.id, { password, email_confirm: true });
          return updated.error ? { error: `The login couldn't be updated: ${updated.error.message}` } : { id: found.id };
        }
        if (data.users.length < 1000) break;
      }
      return { error: "That email is registered but couldn't be found. Try again." };
    },
    async insertOrder(row) {
      // A retry with the same reference keeps the first order (ignoreDuplicates).
      const { error } = await db.from("orders").upsert(row, { onConflict: "ref", ignoreDuplicates: true });
      if (!error) return null;
      return /terms/i.test(error.message ?? "") ? "Please refresh the page and accept the current terms." : "We couldn't save your order. Your cart has been kept. Please try again.";
    },
  };
}
