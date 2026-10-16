"use client";

import type { ReactNode } from "react";
import { CartProvider } from "./CartContext";
import { AuthProvider } from "./AuthContext";
import { PricingProvider } from "./PricingContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PricingProvider>
        <CartProvider>{children}</CartProvider>
      </PricingProvider>
    </AuthProvider>
  );
}
