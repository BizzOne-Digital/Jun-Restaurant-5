"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Item = {
  _id: string;
  name: string;
  price: number;
  description?: string;
  isAvailable: boolean;
  image?: string;
  category?: { _id?: string; name?: string };
};

type Category = { _id: string; name: string };

export default function AdminMenuPage() {
  const [items, setItems] = React.useState<Item[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [creating, setCreating] = React.useState(false);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: "", price: "12.99", category: "", description: "" });
  const [editForm, setEditForm] = React.useState({
    name: "",
    price: "",
    category: "",
    description: "",
    isAvailable: true,
  });

  const load = () => fetch("/api/admin/menu").then((r) => r.json()).then((d) => setItems(d.items ?? []));

  React.useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => {
        const cats = (d.categories as Category[] | undefined) ?? [];
        setCategories(cats);
        const first = cats[0]?._id;
        if (first) setForm((f) => ({ ...f, category: first }));
      });
    load();
  }, []);

  const toggle = async (id: string, isAvailable: boolean) => {
    const res = await fetch(`/api/admin/menu/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !isAvailable }),
    });
    if (!res.ok) {
      toast.error("Failed to update visibility");
      return;
    }
    toast.success(isAvailable ? "Item hidden from customers" : "Item shown to customers");
    load();
  };

  const startEdit = (it: Item) => {
    setEditingId(it._id);
    setEditForm({
      name: it.name,
      price: it.price.toFixed(2),
      category: it.category?._id || "",
      description: it.description || "",
      isAvailable: it.isAvailable,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", price: "", category: "", description: "", isAvailable: true });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.name.trim() || !editForm.category) {
      toast.error("Name and category are required.");
      return;
    }
    const price = Number(editForm.price);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Price must be a positive number.");
      return;
    }
    setSavingId(id);
    const res = await fetch(`/api/admin/menu/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name.trim(),
        price,
        category: editForm.category,
        description: editForm.description.trim(),
        isAvailable: editForm.isAvailable,
      }),
    });
    setSavingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to update item");
      return;
    }
    toast.success("Menu item updated");
    cancelEdit();
    load();
  };

  const removeItem = async (id: string) => {
    if (!confirm("Delete this menu item? This cannot be undone.")) return;
    setDeletingId(id);
    const res = await fetch(`/api/admin/menu/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to delete item");
      return;
    }
    toast.success("Menu item deleted");
    if (editingId === id) cancelEdit();
    load();
  };

  const create = async () => {
    if (!form.name || !form.category) {
      toast.error("Name and category required");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/admin/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        price: Number(form.price),
        category: form.category,
        description: form.description.trim() || "New item — edit details after creation.",
      }),
    });
    setCreating(false);
    if (!res.ok) {
      toast.error("Failed to create");
      return;
    }
    toast.success("Menu item created");
    setForm((f) => ({ ...f, name: "", price: "12.99", description: "" }));
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Menu</h2>
        <p className="mt-1 text-sm text-rice-400">
          Use <span className="font-semibold text-mango-300">Hide</span> to remove an item from the public menu without
          deleting it. Hidden items stay in the database and can be shown again at any time. Customers cannot see, search,
          or check out hidden items.
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-sm font-semibold text-rice-100">Quick add</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <select
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-rice-50"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <Input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Button type="button" onClick={create} disabled={creating}>
            Add item
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        {/* Desktop table */}
        <table className="hidden min-w-full text-left text-sm md:table">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-rice-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Visibility</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr
                key={it._id}
                className={`border-t border-white/5 ${!it.isAvailable && editingId !== it._id ? "opacity-60" : ""}`}
              >
                {editingId === it._id ? (
                  <>
                    <td className="px-4 py-3">
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-rice-50"
                        value={editForm.category}
                        onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                      >
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        value={editForm.price}
                        onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 text-xs text-rice-300">
                        <input
                          type="checkbox"
                          checked={editForm.isAvailable}
                          onChange={(e) => setEditForm((f) => ({ ...f, isAvailable: e.target.checked }))}
                        />
                        Visible to customers
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 text-xs">
                        <button
                          type="button"
                          className="text-avocado-400 hover:underline"
                          onClick={() => saveEdit(it._id)}
                          disabled={savingId === it._id}
                        >
                          {savingId === it._id ? "Saving..." : "Save"}
                        </button>
                        <button type="button" className="text-rice-400 hover:underline" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-semibold text-rice-100">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{it.name}</span>
                        {!it.isAvailable && (
                          <span className="rounded-full border border-coral-300/40 bg-coral-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-coral-200">
                            Hidden
                          </span>
                        )}
                      </div>
                      {it.description ? <p className="mt-1 text-xs text-rice-500">{it.description}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-rice-400">{it.category?.name}</td>
                    <td className="px-4 py-3">${it.price.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className={`text-xs font-semibold hover:underline ${it.isAvailable ? "text-coral-300" : "text-avocado-300"}`}
                        onClick={() => toggle(it._id, it.isAvailable)}
                        title={it.isAvailable ? "Hide from public menu" : "Show on public menu"}
                      >
                        {it.isAvailable ? "Hide" : "Show"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 text-xs">
                        <button type="button" className="text-ocean-300 hover:underline" onClick={() => startEdit(it)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-coral-300 hover:underline"
                          onClick={() => removeItem(it._id)}
                          disabled={deletingId === it._id}
                        >
                          {deletingId === it._id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile cards */}
        <div className="divide-y divide-white/5 md:hidden">
          {items.map((it) => (
            <div key={it._id} className={`space-y-3 p-4 ${!it.isAvailable ? "opacity-60" : ""}`}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-rice-100">{it.name}</p>
                  {!it.isAvailable && (
                    <span className="rounded-full border border-coral-300/40 bg-coral-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-coral-200">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="text-xs text-rice-400">{it.category?.name} · ${it.price.toFixed(2)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <button
                  type="button"
                  className={`font-semibold hover:underline ${it.isAvailable ? "text-coral-300" : "text-avocado-300"}`}
                  onClick={() => toggle(it._id, it.isAvailable)}
                >
                  {it.isAvailable ? "Hide" : "Show"}
                </button>
                <button type="button" className="text-ocean-300 hover:underline" onClick={() => startEdit(it)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="text-coral-300 hover:underline"
                  onClick={() => removeItem(it._id)}
                  disabled={deletingId === it._id}
                >
                  {deletingId === it._id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
