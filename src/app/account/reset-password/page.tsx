import type { Metadata } from "next";
import { AuthCard, ResetPasswordForm } from "@/components/account/AuthForms";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/account/reset-password/",
  title: "Choose a New Password",
  description: "Choose a new password for your OCTA Performance account.",
  noindex: true,
});

export default function ResetPasswordPage() {
  return (
    <div className="px-4 py-16 sm:px-6">
      <AuthCard title="New password" intro="Choose a new password for your account.">
        <ResetPasswordForm />
      </AuthCard>
    </div>
  );
}
