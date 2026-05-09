"use client";

import * as React from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Form = {
  restaurantName: string;
  address: string;
  phone: string;
  email: string;
  openingHours: string;
  logo: string;
  pickupPrepareTimeMinutes: number;
};

const empty: Form = {
  restaurantName: "",
  address: "",
  phone: "",
  email: "",
  openingHours: "",
  logo: "",
  pickupPrepareTimeMinutes: 20,
};

export default function AdminSettingsPage() {
  const [form, setForm] = React.useState<Form>(empty);
  const [saving, setSaving] = React.useState(false);
  const [logoUploading, setLogoUploading] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        const s = d.settings as Partial<Form> | null;
        if (!s) return;
        setForm({
          restaurantName: s.restaurantName ?? "",
          address: s.address ?? "",
          phone: s.phone ?? "",
          email: s.email ?? "",
          openingHours: s.openingHours ?? "",
          logo: s.logo ?? "",
          pickupPrepareTimeMinutes:
            typeof s.pickupPrepareTimeMinutes === "number" && Number.isFinite(s.pickupPrepareTimeMinutes)
              ? s.pickupPrepareTimeMinutes
              : 20,
        });
      });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        toast.error("Save failed");
        return;
      }
      toast.success("Settings saved");
    } finally {
      setSaving(false);
    }
  };

  const onUploadLogo = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Logo must be an image (PNG, JPG, or SVG).");
      return;
    }
    if (file.size > 2_000_000) {
      toast.error("Logo file must be under 2 MB.");
      return;
    }
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/settings/logo", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        toast.error(data.error || "Logo upload failed");
        return;
      }
      setForm((f) => ({ ...f, logo: data.url as string }));
      toast.success("Logo uploaded — don't forget to Save settings.");
    } catch {
      toast.error("Logo upload failed");
    } finally {
      setLogoUploading(false);
    }
  };

  const previewSrc = form.logo?.trim() || "";
  const isAbsolute = /^https?:\/\//i.test(previewSrc);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-2xl">Site settings</h2>
        <p className="text-sm text-rice-400">
          These details show on the public website and on order confirmation emails sent to customers.
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-rice-300">Restaurant</h3>

        <label className="block text-xs font-semibold uppercase tracking-wide text-rice-400">
          Restaurant name
          <Input
            className="mt-1"
            value={form.restaurantName}
            onChange={(e) => setForm({ ...form, restaurantName: e.target.value })}
          />
        </label>

        <label className="block text-xs font-semibold uppercase tracking-wide text-rice-400">
          Address
          <Input
            className="mt-1"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-rice-400">
            Phone
            <Input
              className="mt-1"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-rice-400">
            Email
            <Input
              className="mt-1"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
        </div>

        <label className="block text-xs font-semibold uppercase tracking-wide text-rice-400">
          Opening hours
          <Textarea
            className="mt-1"
            value={form.openingHours}
            onChange={(e) => setForm({ ...form, openingHours: e.target.value })}
          />
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-rice-300">Pickup</h3>

        <label className="block text-xs font-semibold uppercase tracking-wide text-rice-400">
          Default pickup preparation time (minutes)
          <Input
            className="mt-1 max-w-[180px]"
            type="number"
            min={1}
            max={240}
            value={form.pickupPrepareTimeMinutes}
            onChange={(e) =>
              setForm({
                ...form,
                pickupPrepareTimeMinutes: Math.max(1, Math.min(240, Number(e.target.value) || 0)),
              })
            }
          />
          <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-rice-500">
            Shown on the order success page and in the customer confirmation email.
            Per-order overrides will arrive in a later update.
          </span>
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-rice-300">Logo</h3>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
            {previewSrc ? (
              isAbsolute ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewSrc} alt="Logo preview" className="max-h-24 max-w-24 object-contain" />
              ) : (
                <Image
                  src={previewSrc}
                  alt="Logo preview"
                  width={96}
                  height={96}
                  className="max-h-24 max-w-24 object-contain"
                />
              )
            ) : (
              <span className="text-[11px] text-rice-500">No logo</span>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-rice-400">
              Logo URL or path
              <Input
                className="mt-1"
                placeholder="https://yourdomain.com/logo.png  or  /images/logo.png"
                value={form.logo}
                onChange={(e) => setForm({ ...form, logo: e.target.value })}
              />
              <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-rice-500">
                For the order confirmation email to show your logo, use a public HTTPS URL.
                Local paths like <code className="rounded bg-white/10 px-1">/images/logo.png</code>{" "}
                only work after the site is deployed and the file is reachable from the internet.
              </span>
            </label>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-rice-400">
                Or upload a new logo
              </p>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={logoUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadLogo(f);
                  e.target.value = "";
                }}
                className="block w-full text-xs text-rice-300 file:mr-3 file:rounded-lg file:border-0 file:bg-mango-400/20 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-mango-200 hover:file:bg-mango-400/30 disabled:opacity-60"
              />
              <span className="block text-[11px] text-rice-500">
                PNG, JPG, WebP, or SVG. Max 2 MB. Stored under <code className="rounded bg-white/10 px-1">/public/uploads/</code>.
              </span>
            </div>
          </div>
        </div>
      </section>

      <Button type="button" onClick={save} disabled={saving} size="lg">
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}
