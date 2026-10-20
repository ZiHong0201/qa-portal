import { AuthCard } from "@/components/auth-card";
import { ForgotPasswordForm } from "@/components/password-forms";

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Forgot password">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
