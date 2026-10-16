import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCard, LoginForm } from "@/components/account/AuthForms";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/account/login/",
  title: "Sign In",
  description: "Sign in to your OCTA Performance account.",
  noindex: true,
});

export default function LoginPage() {
  return (
    <div className="px-4 py-16 sm:px-6">
      <AuthCard title="Customer sign in" intro="See your ordered items, payment confirmations and order history.">
        {/* useSearchParams (the ?next= redirect) needs a Suspense boundary in a static export. */}
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </AuthCard>
    </div>
  );
}
