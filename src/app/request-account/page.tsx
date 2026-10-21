import { AuthCard } from "@/components/auth-card";
import { RequestAccountForm } from "@/components/password-forms";

export default function RequestAccountPage() {
  return (
    <AuthCard title="Request an account">
      <RequestAccountForm />
    </AuthCard>
  );
}
