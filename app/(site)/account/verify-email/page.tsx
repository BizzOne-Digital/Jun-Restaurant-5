import { Suspense } from "react";
import { VerifyEmailContent } from "@/components/site/verify-email-content";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-rice-400">Loading verification…</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
