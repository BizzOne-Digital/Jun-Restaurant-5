import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { EmailVerificationBanner } from "@/components/site/email-verification-banner";

export default async function AccountHomePage() {
  const session = await getSession();
  if (!session?.user) redirect("/account/login");
  await connectDB();
  const user = await User.findById(session.user.id).select("emailVerified email").lean<{ emailVerified?: boolean; email?: string } | null>();
  const verified = Boolean(user?.emailVerified);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-mango-300">Account</p>
      <h1 className="font-display text-3xl text-rice-50">Welcome back, {session.user.name}</h1>
      <p className="mt-2 text-sm text-rice-400">
        Account status:{" "}
        <span className={verified ? "text-avocado-400" : "text-coral-300"}>
          {verified ? "Verified" : "Email not verified"}
        </span>
      </p>
      {!verified && user?.email ? <EmailVerificationBanner email={user.email} /> : null}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Link href="/account/profile" className="glass-panel rounded-2xl p-5 transition hover:border-white/20">
          <p className="font-semibold text-rice-50">Profile</p>
          <p className="text-sm text-rice-400">Update your details</p>
        </Link>
        <Link href="/account/orders" className="glass-panel rounded-2xl p-5 transition hover:border-white/20">
          <p className="font-semibold text-rice-50">My orders</p>
          <p className="text-sm text-rice-400">Track history</p>
        </Link>
      </div>
      <div className="mt-8">
        <Link href="/menu">
          <Button>Start an order</Button>
        </Link>
      </div>
    </div>
  );
}
