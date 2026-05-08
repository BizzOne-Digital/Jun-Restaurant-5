import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { SiteShell } from "@/components/site/site-shell";

/** Top-level route so `/payment-success` always resolves with full site chrome (avoids blank shell issues). */
export default function PaymentSuccessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-charcoal-900">
      <Navbar />
      <SiteShell>
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
      </SiteShell>
      <Footer />
    </div>
  );
}
