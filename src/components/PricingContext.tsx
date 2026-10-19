"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { accountsEnabled } from "@/lib/supabase";
import { INDEXABLE } from "@/lib/site";
import { allowCustomerDemo } from "@/lib/customerDemo";
import { ADMIN_SESSION_KEY, loadBackoffice, onBackofficeChange } from "@/lib/backoffice/local";
import { priceFor, todaySA } from "@/lib/backoffice/calc";
import { isSoldOut, stockLevels } from "@/lib/backoffice/stock";
import { courierRates } from "@/lib/courierRates";
import { accountEmails } from "@/lib/backoffice/customerForm";
import { callBackoffice } from "@/lib/backoffice/api";
import type { CatalogueItem, Client } from "@/lib/backoffice/types";

type Pricing = {
  /** Price this visitor pays for a SKU; `fallback` is the built-in website price. null = on quotation. */
  price: (sku: string, fallback: number | null) => number | null;
  /** The website (retail) price, to show next to a customer's own price. */
  listPrice: (sku: string, fallback: number | null) => number | null;
  /** False when the back office has hidden this SKU from the website. */
  available: (sku: string) => boolean;
  /** Product text edited in the back office, if any. */
  text: (slug: string) => { short: string; description: string } | null;
  /** The signed-in customer's client record, when they have agreed pricing. */
  client: Client | null;
  /** Back-office entry for a SKU (coming-soon and added products included). */
  item: (sku: string) => CatalogueItem | null;
  /** Products added in the back office (merch, detailing) that are live on the website. */
  extras: CatalogueItem[];
  /** Courier charge per pack, set in the back office. */
  courierFee: number;
  /** Purity received for a website product, when switched on in its costing. */
  purity: (slug: string) => number | null;
  /** The signed-in user is back-office staff (shows the Back office button). */
  staff: boolean;
  /** Shown as out of stock on the website (set in the back office, or automatic from Stock control). */
  soldOut: (sku: string) => boolean;
};

const fallback: Pricing = {
  price: (_sku, f) => f,
  listPrice: (_sku, f) => f,
  available: () => true,
  text: () => null,
  client: null,
  item: () => null,
  extras: [],
  courierFee: courierRates.fee,
  purity: () => null,
  staff: false,
  soldOut: () => false,
};

const Ctx = createContext<Pricing>(fallback);

/** What the shop needs from the back office: no costs, and only this customer's own prices. */
type Source = { catalogue: CatalogueItem[]; courierFee: number | null; client: Client | null };
type PublicReply = ({ ready: false } | ({ ready: true } & Source)) & { staff?: boolean };

/**
 * Prices on the shop. In demo mode they come from the back-office demo store,
 * so admin price changes and a customer's agreed prices show immediately.
 * Live, they come from the back-office server (public catalogue, plus the
 * signed-in customer's own prices); until it answers, or if the back office
 * isn't set up yet, the built-in price list is used.
 */
export function PricingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [source, setSource] = useState<Source | null>(null);
  const [staff, setStaff] = useState(false);
  const email = user?.email?.toLowerCase() ?? null;

  useEffect(() => {
    if (allowCustomerDemo(process.env.NEXT_PUBLIC_CUSTOMER_DEMO, window.location.hostname, accountsEnabled, INDEXABLE, process.env.NEXT_PUBLIC_DEMO_HOSTS)) {
      const read = () => {
        const data = loadBackoffice();
        try { setStaff(!!sessionStorage.getItem(ADMIN_SESSION_KEY)); } catch { setStaff(false); }
        // The website login email, or any authorised buyer on the account (Customer Information Form).
        const client = email ? data.clients.find((c) => accountEmails(c).includes(email)) ?? null : null;
        const levels = stockLevels(data, todaySA());
        setSource({ catalogue: data.catalogue.map((i) => ({ ...i, soldOut: isSoldOut(i, levels) })), courierFee: data.settings.courierFee ?? null, client });
      };
      read();
      return onBackofficeChange(read);
    }
    if (!accountsEnabled) return;
    let active = true;
    callBackoffice<PublicReply>({ op: "public" })
      .then((reply) => {
        if (!active) return;
        setSource(reply.ready ? { catalogue: reply.catalogue, courierFee: reply.courierFee, client: reply.client } : null);
        setStaff(reply.staff === true);
      })
      .catch(() => { if (active) { setSource(null); setStaff(false); } });
    return () => { active = false; };
  }, [email]);

  const value = useMemo<Pricing>(() => {
    if (!source) return { ...fallback, staff };
    const data = source;
    const bySku = new Map(data.catalogue.map((i) => [i.sku, i]));
    const client = data.client;
    return {
      price: (sku, f) => {
        const item = bySku.get(sku);
        if (!item) return f;
        if (!item.active || item.comingSoon) return null;
        return priceFor(item, client);
      },
      listPrice: (sku, f) => bySku.get(sku)?.retail ?? f,
      available: (sku) => bySku.get(sku)?.active ?? true,
      text: (slug) => {
        const item = data.catalogue.find((i) => i.slug === slug && !i.custom);
        return item ? { short: item.short, description: item.description } : null;
      },
      client,
      item: (sku) => bySku.get(sku) ?? null,
      extras: data.catalogue.filter((i) => i.custom && i.active && !i.comingSoon),
      courierFee: data.courierFee ?? courierRates.fee,
      staff,
      soldOut: (sku) => bySku.get(sku)?.soldOut === true,
      purity: (slug) => {
        const c = data.catalogue.find((i) => i.slug === slug && i.costing?.purityEnabled && i.costing.purity !== null)?.costing;
        return c?.purity ?? null;
      },
    };
  }, [source, staff]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePricing(): Pricing {
  return useContext(Ctx);
}
