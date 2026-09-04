"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  sku: string;
  slug: string;
  name: string;
  size: string;
  price: number;
  qty: number;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (sku: string) => void;
  setQty: (sku: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  ready: boolean;
};

const STORAGE_KEY = "octax-cart-v1";
const CartCtx = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
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
      add: (item, qty = 1) =>
        setItems((prev) => {
          const found = prev.find((i) => i.sku === item.sku);
          if (found) {
            return prev.map((i) =>
              i.sku === item.sku ? { ...i, qty: i.qty + qty } : i,
            );
          }
          return [...prev, { ...item, qty }];
        }),
      remove: (sku) => setItems((prev) => prev.filter((i) => i.sku !== sku)),
      setQty: (sku, qty) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((i) => i.sku !== sku)
            : prev.map((i) => (i.sku === sku ? { ...i, qty } : i)),
        ),
      clear: () => setItems([]),
    };
  }, [items, ready]);

  return <CartCtx.Provider value={api}>{children}</CartCtx.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
