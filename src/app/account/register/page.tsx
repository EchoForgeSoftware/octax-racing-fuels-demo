import type { Metadata } from "next";
import { AuthCard, RegisterForm } from "@/components/account/AuthForms";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/account/register/",
  title: "Create Account",
  description: "Create an OCTA Performance account to track orders and reorder quickly.",
  noindex: true,
});

export default function RegisterPage() {
  return (
    <div className="px-4 py-16 sm:px-6">
      <AuthCard title="Create account" intro="Keep your delivery details, see your order history and reorder in one click.">
        <RegisterForm />
      </AuthCard>
    </div>
  );
}
