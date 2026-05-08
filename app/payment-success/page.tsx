import { Suspense } from "react";
import { PaymentSuccessContent } from "@/components/site/payment-success-content";
import { PaymentSuccessSkeleton } from "@/components/site/payment-success-skeleton";

/**
 * Stripe Checkout success_url → `/payment-success?session_id={CHECKOUT_SESSION_ID}`
 * This page calls `/api/stripe/verify-session` for server-side Stripe confirmation
 * (current client choice: no webhook flow).
 */
export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentSuccessSkeleton />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
