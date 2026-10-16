import type { Metadata } from "next";
import { AuthCard, ForgotPasswordForm } from "@/components/account/AuthForms";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/account/forgot-password/",
  title: "Reset Password",
  description: "Get a link to reset your OCTA Performance account password.",
  noindex: true,
});

export default function ForgotPasswordPage() {
  return (
    <div className="px-4 py-16 sm:px-6">
      <AuthCard title="Forgot password" intro="Enter your email and we will send you a link to choose a new password.">
        <ForgotPasswordForm />
      </AuthCard>
    </div>
  );
}
