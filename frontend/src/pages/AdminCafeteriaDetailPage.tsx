import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import {
  createCafeteriaMenuItem,
  getCafeteriaDetail,
  getCafeteriaMenuItems,
  getCafeteriaOrders,
  MenuItemAdmin,
  OrderResponse,
  updateCafeteriaMenuItem,
} from "../services/adminService";
import { getCurrentUser as getUser } from "../services/authService";

type CafeteriaTab = "menu" | "orders" | "payments";

const AdminCafeteriaDetailPage: React.FC = () => {
  const { cafeteriaId } = useParams();
  const id = Number(cafeteriaId);
  const user = getUser();
  const isSuperAdmin = user?.role === "superadmin";

  const [detail, setDetail] = useState<any>(null);
  const [menu, setMenu] = useState<MenuItemAdmin[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [activeTab, setActiveTab] = useState<CafeteriaTab>("menu");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", price: 0, description: "", imageUrl: "", isAvailable: true });

  const load = async () => {
    const [d, m, o] = await Promise.all([
      getCafeteriaDetail(id),
      getCafeteriaMenuItems(id),
      isSuperAdmin ? getCafeteriaOrders(id) : Promise.resolve([] as OrderResponse[]),
    ]);
    setDetail(d);
    setMenu(m);
    setOrders(o);
  };

  useEffect(() => {
    load().catch((err: any) => {
      if (err?.response?.status === 403) setError("Bu kafeteryayı yönetme yetkiniz yok.");
      else setError("Kafeterya detayları yüklenemedi.");
    });
  }, [id, isSuperAdmin]);

  const unpaidOrders = useMemo(
    () => orders.filter((o) => o.status === "NotPaid" || (!o.isPaid && o.status !== "Paid" && o.status !== "Cancelled")),
    [orders],
  );

  const totalUnpaidDebt = useMemo(
    () => unpaidOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0),
    [unpaidOrders],
  );

  if (error) {
    return (
      <AdminLayout title="Kafeterya Detayı">
        <div className="admin-card admin-card-body text-red-600">{error}</div>
      </AdminLayout>
    );
  }

  if (!detail) {
    return (
      <AdminLayout title="Kafeterya Detayı">
        <div className="admin-card admin-card-body text-slate-500">Yükleniyor...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={detail.name}>
      <Link to="/admin/cafeterias" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        ← Kafeteryalar
      </Link>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">{detail.name}</h2>
        <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
          <span className="text-red-500">📍</span>
          <span>{detail.location || "Konum belirtilmemiş"}</span>
        </div>
        {user?.role === "subadmin" && (
          <p className="mt-2 text-xs text-slate-500">
            Alt Admin olarak yalnızca menü yönetimi yapabilirsiniz. Sipariş, ödeme ve borç işlemleri kasiyer ekranından yürütülür.
          </p>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={`admin-tab ${activeTab === "menu" ? "admin-tab-active" : ""}`}
            onClick={() => setActiveTab("menu")}
          >
            🍽️ Menü
          </button>
          {isSuperAdmin && (
            <>
              <button
                type="button"
                className={`admin-tab ${activeTab === "orders" ? "admin-tab-active" : ""}`}
                onClick={() => setActiveTab("orders")}
              >
                📋 Siparişler
              </button>
              <button
                type="button"
                className={`admin-tab ${activeTab === "payments" ? "admin-tab-active" : ""}`}
                onClick={() => setActiveTab("payments")}
              >
                💳 Ödeme / Borç
              </button>
            </>
          )}
        </div>
        {activeTab === "menu" && (
          <button
            type="button"
            className={showForm ? "admin-btn-secondary mb-3" : "admin-btn-primary mb-3"}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "✕ İptal" : "+ Menüye Ekle"}
          </button>
        )}
      </div>

      {activeTab === "menu" && (
        <div className="space-y-6">
          {showForm && (
            <section className="admin-card admin-card-body">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Menü Ürünü Ekle</h3>
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  await createCafeteriaMenuItem(id, form);
                  setForm({ name: "", price: 0, description: "", imageUrl: "", isAvailable: true });
                  setShowForm(false);
                  await load();
                }}
              >
                <div>
                  <label className="admin-label">Ürün Adı</label>
                  <input
                    className="admin-input"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="admin-label">Fiyat (TL)</label>
                  <input
                    className="admin-input"
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="admin-label">Açıklama</label>
                  <input
                    className="admin-input"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="admin-label">Görsel URL</label>
                  <input
                    className="admin-input"
                    value={form.imageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  />
                </div>
                <label className="flex items-center gap-2 md:col-span-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isAvailable}
                    onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))}
                  />
                  Satışa uygun
                </label>
                <div className="md:col-span-2">
                  <button type="submit" className="admin-btn-primary">
                    Ürün Ekle
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="admin-card admin-card-body">
            {menu.length === 0 ? (
              <div className="admin-empty">Bu kafeteryada henüz menü ürünü yok.</div>
            ) : (
              <div className="space-y-3">
                {menu.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-col gap-3 rounded-lg border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-medium text-slate-900">
                        {m.name} <span className="text-slate-500">- {m.price} TL</span>
                      </div>
                      <div className="text-sm text-slate-500">{m.description || "Açıklama yok"}</div>
                      <div className="mt-1">
                        <span className={m.isAvailable ? "admin-badge-active" : "admin-badge-inactive"}>
                          {m.isAvailable ? "Uygun" : "Pasif"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="admin-btn-outline-gray"
                      onClick={async () => {
                        await updateCafeteriaMenuItem(id, m.id, {
                          name: m.name,
                          price: m.price,
                          description: m.description,
                          imageUrl: m.imageUrl,
                          isAvailable: !m.isAvailable,
                        });
                        await load();
                      }}
                    >
                      {m.isAvailable ? "Pasifleştir" : "Aktifleştir"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === "orders" && isSuperAdmin && (
        <section className="admin-card admin-card-body">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Siparişler (read-only)</h3>
          {orders.length === 0 ? (
            <div className="admin-empty">Bu kafeteryada sipariş bulunmuyor.</div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="rounded-lg border border-slate-100 p-4">
                  <div className="font-medium text-slate-900">
                    #{o.orderNumber} - {o.status}
                  </div>
                  <div className="text-sm text-slate-600">
                    {o.customerName} - {o.totalAmount} TL
                    {o.isPaid ? " · Ödendi" : " · Ödenmedi"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "payments" && isSuperAdmin && (
        <section className="admin-card admin-card-body space-y-6">
          <div>
            <h3 className="mb-2 text-base font-semibold text-slate-900">Ödeme / Borç (read-only özet)</h3>
            <p className="text-sm text-slate-500">
              Bu bölümde seçili kafeteryaya ait ödeme ve borç kayıtları yönetilecektir. Operasyonel tahsilat işlemleri
              kasiyer ekranından yapılır.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-5">
              <div className="text-2xl font-semibold text-slate-900">{unpaidOrders.length}</div>
              <div className="mt-1 text-sm text-slate-500">Açık borç kaydı</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-5">
              <div className="text-2xl font-semibold text-slate-900">{totalUnpaidDebt.toFixed(2)} TL</div>
              <div className="mt-1 text-sm text-slate-500">Toplam açık borç tutarı</div>
            </div>
          </div>

          {unpaidOrders.length === 0 ? (
            <div className="admin-empty">Bu kafeteryada açık borç kaydı bulunmuyor.</div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-700">Açık borç kayıtları</h4>
              {unpaidOrders.map((o) => (
                <div key={o.id} className="rounded-lg border border-red-100 bg-red-50/40 p-4">
                  <div className="font-medium text-slate-900">
                    #{o.orderNumber} · {o.customerName || "Müşteri"}
                  </div>
                  <div className="text-sm text-slate-600">
                    {o.totalAmount} TL · {o.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </AdminLayout>
  );
};

export default AdminCafeteriaDetailPage;
