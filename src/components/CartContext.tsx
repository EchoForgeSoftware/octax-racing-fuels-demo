"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { products } from "@/lib/products";
import { usePricing } from "./PricingContext";

export type CartItem = {
  sku: string;
  slug: string;
  name: string;
  size: string;
  price: number;
  qty: number;
};

export type AddedSignal = { name: string; qty: number; at: number };

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (sku: string) => void;
  setQty: (sku: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  ready: boolean;
  lastAdded: AddedSignal | null;
};

// v2: catalogue changed to the OCTA range, so carts from the sample catalogue are dropped.
const STORAGE_KEY = "octa-cart-v2";
const CartCtx = createContext<CartState | null>(null);

/**
 * Saved carts hold a snapshot of each item. Refresh name, size and price from
 * the current catalogue so price-list changes reach existing carts, and drop
 * items that are no longer sold or are now priced on quotation. `priceOf` gives
 * the back-office price and the signed-in customer's own price.
 */
function reprice(saved: CartItem[], priceOf: (sku: string, fallback: number | null) => number | null): CartItem[] {
  return saved.flatMap((item) => {
    const product = products.find((p) => p.slug === item.slug);
    const variant = product?.variants.find((v) => v.sku === item.sku);
    const price = variant ? priceOf(variant.sku, variant.price) : null;
    if (!product || !variant || price === null) return [];
    return [{ ...item, name: product.name, size: variant.size, price }];
  });
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [lastAdded, setLastAdded] = useState<AddedSignal | null>(null);
  const pricing = usePricing();

  // Prices change in the back office and differ per signed-in customer.
  useEffect(() => {
    setItems((prev) => (prev.length ? reprice(prev, pricing.price) : prev));
  }, [pricing]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(reprice(JSON.parse(raw) as CartItem[], (_sku, f) => f));
    } catch {
      // ignore corrupt or unavailable storage
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage may be full or blocked; cart still works in-memory
    }
  }, [items, ready]);

  const api = useMemo<CartState>(() => {
    const count = items.reduce((n, i) => n + i.qty, 0);
    const subtotal = items.reduce((n, i) => n + i.qty * i.price, 0);
    return {
      items,
      count,
      subtotal,
      ready,
      lastAdded,
      add: (item, qty = 1) => {
        setItems((prev) => {
          const found = prev.find((i) => i.sku === item.sku);
          if (found) {
            return prev.map((i) =>
              i.sku === item.sku ? { ...i, qty: i.qty + qty } : i,
            );
          }
          return [...prev, { ...item, price: pricing.price(item.sku, item.price) ?? item.price, qty }];
        });
        setLastAdded({ name: item.name, qty, at: Date.now() });
      },
      remove: (sku) => setItems((prev) => prev.filter((i) => i.sku !== sku)),
      setQty: (sku, qty) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((i) => i.sku !== sku)
            : prev.map((i) => (i.sku === sku ? { ...i, qty } : i)),
        ),
      clear: () => setItems([]),
    };
  }, [items, ready, lastAdded, pricing]);

  return <CartCtx.Provider value={api}>{children}</CartCtx.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
