"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { accountsEnabled } from "@/lib/supabase";
import { INDEXABLE } from "@/lib/site";
import { allowCustomerDemo } from "@/lib/customerDemo";
import { loadBackoffice, onBackofficeChange } from "@/lib/backoffice/local";
import { priceFor } from "@/lib/backoffice/calc";
import { courierRates } from "@/lib/courierRates";
import { accountEmails } from "@/lib/backoffice/customerForm";
import type { BackofficeData, CatalogueItem, Client } from "@/lib/backoffice/types";

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
};

const Ctx = createContext<Pricing>(fallback);

/**
 * Prices on the shop. In demo mode they come from the back-office demo store,
 * so admin price changes and a customer's agreed prices show immediately. In
 * the live setup they will come from the business database; until then the
 * built-in price list is used.
 */
export function PricingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<BackofficeData | null>(null);

  useEffect(() => {
    if (!allowCustomerDemo(process.env.NEXT_PUBLIC_CUSTOMER_DEMO, window.location.hostname, accountsEnabled, INDEXABLE, process.env.NEXT_PUBLIC_DEMO_HOSTS)) return;
    setData(loadBackoffice());
    return onBackofficeChange(() => setData(loadBackoffice()));
  }, []);

  const value = useMemo<Pricing>(() => {
    if (!data) return fallback;
    const bySku = new Map(data.catalogue.map((i) => [i.sku, i]));
    const email = user?.email?.toLowerCase();
    // The website login email, or any authorised buyer on the account (Customer Information Form).
    const client = email ? data.clients.find((c) => accountEmails(c).includes(email)) ?? null : null;
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
      courierFee: data.settings.courierFee ?? courierRates.fee,
      purity: (slug) => {
        const c = data.catalogue.find((i) => i.slug === slug && i.costing?.purityEnabled && i.costing.purity !== null)?.costing;
        return c?.purity ?? null;
      },
    };
  }, [data, user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePricing(): Pricing {
  return useContext(Ctx);
}
