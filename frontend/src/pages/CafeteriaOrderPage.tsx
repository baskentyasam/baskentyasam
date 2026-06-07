import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../services/authService";
import {
  getActiveCafeterias,
  getMenuByCafeteria,
  createOrder,
  getMyOrders,
  getMyUnpaidOrders,
  getPickupTimeDensity,
  ActiveCafeteria,
  MenuItemFromApi,
  MyUnpaidOrdersSummary,
  OrderResponse,
  PickupTimeDensity,
} from "../services/cafeteriaService";

interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
}

type OrderStatus =
  | "Onaylanması Bekleniyor"
  | "Hazırlanıyor"
  | "Hazırlandı"
  | "Teslim Alındı"
  | "İptal Edildi"
  | "Ödenmedi";

interface OrderItem {
  menuItemId: number;
  name: string;
  quantity: number;
  price: number;
}

interface PastOrder {
  id: number;
  cafeteriaName?: string;
  items: OrderItem[];
  totalPrice: number;
  selectedTime: string;
  note: string;
  status: OrderStatus;
  createdAt: string;
}

const categoryList = [
  { name: "Sandviçler", icon: "🥪" },
  { name: "Makarnalar", icon: "🍝" },
  { name: "Tostlar", icon: "🍞" },
  { name: "Salatalar", icon: "🥗" },
  { name: "Tavuk Yemekleri", icon: "🍗" },
  { name: "Et Yemekleri", icon: "🥩" },
  { name: "Soğuk İçecekler", icon: "🥤" },
  { name: "Sıcak İçecekler", icon: "☕" },
  { name: "Tatlılar", icon: "🍰" },
];

const categoryMapping: Record<string, string> = {
  "Tavuklu Sandviç": "Sandviçler",
  "Peynirli Sandviç": "Sandviçler",
  "Ton Balıklı Sandviç": "Sandviçler",
  "Penne Arabiata": "Makarnalar",
  "Kremalı Makarna": "Makarnalar",
  "Kaşarlı Tost": "Tostlar",
  "Karışık Tost": "Tostlar",
  "Akdeniz Salata": "Salatalar",
  "Tavuklu Salata": "Salatalar",
  "Izgara Tavuk": "Tavuk Yemekleri",
  "Tavuk Şinitzel": "Tavuk Yemekleri",
  Köfte: "Et Yemekleri",
  "Et Sote": "Et Yemekleri",
  Kola: "Soğuk İçecekler",
  Ayran: "Soğuk İçecekler",
  Su: "Soğuk İçecekler",
  Çay: "Sıcak İçecekler",
  Kahve: "Sıcak İçecekler",
  Cheesecake: "Tatlılar",
  Sufle: "Tatlılar",
  Hamburger: "Et Yemekleri",
  Tost: "Tostlar",
};

const categoryIcons: Record<string, string> = {
  Sandviçler: "🥪",
  Makarnalar: "🍝",
  Tostlar: "🍞",
  Salatalar: "🥗",
  "Tavuk Yemekleri": "🍗",
  "Et Yemekleri": "🥩",
  "Soğuk İçecekler": "🥤",
  "Sıcak İçecekler": "☕",
  Tatlılar: "🍰",
};

const statusStyles: Record<string, string> = {
  "Onaylanması Bekleniyor":
    "bg-yellow-100 text-yellow-800 border border-yellow-200",
  Hazırlanıyor: "bg-orange-100 text-orange-800 border border-orange-200",
  Hazırlandı: "bg-blue-100 text-blue-800 border border-blue-200",
  "Teslim Alındı": "bg-green-100 text-green-800 border border-green-200",
  "İptal Edildi": "bg-red-100 text-red-800 border border-red-200",
  Ödenmedi: "bg-rose-100 text-rose-800 border border-rose-200",
};

const CART_STORAGE_KEY = "cafeteria_cart";
const SELECTED_CAFE_STORAGE_KEY = "cafeteria_selected_id";

interface CartItem {
  itemId: number;
  quantity: number;
}

interface StoredCart {
  cafeteriaId: number;
  items: CartItem[];
}

function loadCartFromStorage(cafeteriaId: number): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as StoredCart;
    if (data.cafeteriaId !== cafeteriaId) return [];
    return data.items || [];
  } catch {
    return [];
  }
}

function saveCartToStorage(
  cafeteriaId: number,
  items: { item: MenuItem; quantity: number }[],
) {
  const data: StoredCart = {
    cafeteriaId,
    items: items.map((si) => ({
      itemId: si.item.id,
      quantity: si.quantity,
    })),
  };
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data));
}

function clearCartStorage() {
  localStorage.removeItem(CART_STORAGE_KEY);
}

function mapApiToMenuItem(apiItem: MenuItemFromApi): MenuItem {
  const category = categoryMapping[apiItem.name] || "Et Yemekleri";
  const image = categoryIcons[category] || "🍽️";
  return {
    id: apiItem.id,
    name: apiItem.name,
    price: apiItem.price,
    category,
    image,
    description: apiItem.description || "",
  };
}

function mapOrderResponse(order: OrderResponse): PastOrder {
  return {
    id: order.id,
    cafeteriaName: order.cafeteriaName,
    items: order.items.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
    totalPrice: order.totalPrice,
    selectedTime: order.pickupTime,
    note: order.note || "",
    status: order.status as OrderStatus,
    createdAt: order.createdAt,
  };
}

const CafeteriaOrderPage: React.FC = () => {
  const user = getCurrentUser();
  const isStudent = user?.role === "student";

  const [activeCafeterias, setActiveCafeterias] = useState<ActiveCafeteria[]>([]);
  const [cafeteriaListLoading, setCafeteriaListLoading] = useState(true);
  const [cafeteriaListError, setCafeteriaListError] = useState("");
  const [selectedCafeteria, setSelectedCafeteria] = useState<ActiveCafeteria | null>(
    null,
  );
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<string>("Sandviçler");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<
    { item: MenuItem; quantity: number }[]
  >([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [note, setNote] = useState("");
  const [orders, setOrders] = useState<PastOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [unpaidSummary, setUnpaidSummary] = useState<MyUnpaidOrdersSummary | null>(
    null,
  );
  const [unpaidLoading, setUnpaidLoading] = useState(true);
  const [showUnpaidDetails, setShowUnpaidDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [activeOrdersPage, setActiveOrdersPage] = useState(0);
  const [pastOrdersPage, setPastOrdersPage] = useState(0);
  const [density, setDensity] = useState<PickupTimeDensity[]>([]);

  const unpaidCount = unpaidSummary?.count ?? 0;
  const unpaidLimit = unpaidSummary?.unpaidLimit ?? 3;
  const totalDebt = unpaidSummary?.totalDebt ?? 0;
  const isUnpaidLimitReached = unpaidCount >= unpaidLimit;

  useEffect(() => {
    const loadCafeterias = async () => {
      setCafeteriaListLoading(true);
      setCafeteriaListError("");
      try {
        const list = await getActiveCafeterias();
        setActiveCafeterias(list);
        const savedId = sessionStorage.getItem(SELECTED_CAFE_STORAGE_KEY);
        if (savedId) {
          const cafe = list.find((c) => c.id === Number(savedId));
          if (cafe) setSelectedCafeteria(cafe);
        }
      } catch {
        setCafeteriaListError("Kafeteryalar yüklenemedi.");
      } finally {
        setCafeteriaListLoading(false);
      }
    };
    void loadCafeterias();
  }, []);

  useEffect(() => {
    if (!selectedCafeteria) {
      setMenuItems([]);
      setMenuLoading(false);
      setMenuError("");
      setCartLoaded(true);
      return;
    }

    const loadMenu = async () => {
      setMenuLoading(true);
      setMenuError("");
      setCartLoaded(false);
      try {
        const data = await getMenuByCafeteria(selectedCafeteria.id);
        const mapped = data.map(mapApiToMenuItem);
        setMenuItems(mapped);

        const stored = loadCartFromStorage(selectedCafeteria.id);
        if (stored.length > 0) {
          const restored = stored
            .map((ci) => {
              const item = mapped.find((m) => m.id === ci.itemId);
              return item ? { item, quantity: ci.quantity } : null;
            })
            .filter(Boolean) as { item: MenuItem; quantity: number }[];
          setSelectedItems(restored);
        } else {
          setSelectedItems([]);
        }
      } catch {
        setMenuError("Menü yüklenemedi.");
        setMenuItems([]);
        setSelectedItems([]);
      } finally {
        setMenuLoading(false);
        setCartLoaded(true);
      }
    };

    void loadMenu();
  }, [selectedCafeteria]);

  const refreshOrdersAndUnpaid = useCallback(async () => {
    try {
      const [ordersData, unpaidData, densityData] = await Promise.all([
        getMyOrders(),
        getMyUnpaidOrders(),
        getPickupTimeDensity(),
      ]);
      setOrders(ordersData.map(mapOrderResponse));
      setUnpaidSummary(unpaidData);
      setDensity(densityData);
    } catch (err) {
      console.error("Siparişler veya ödenmemiş özet yüklenemedi:", err);
    } finally {
      setOrdersLoading(false);
      setUnpaidLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshOrdersAndUnpaid();
    const interval = window.setInterval(() => void refreshOrdersAndUnpaid(), 15000);
    return () => window.clearInterval(interval);
  }, [refreshOrdersAndUnpaid]);

  useEffect(() => {
    if (!cartLoaded || !selectedCafeteria) return;
    if (selectedItems.length === 0) {
      clearCartStorage();
      return;
    }
    saveCartToStorage(selectedCafeteria.id, selectedItems);
  }, [selectedItems, cartLoaded, selectedCafeteria]);

  const filteredItems = useMemo(() => {
    const trimmedSearch = searchTerm.trim().toLowerCase();

    if (trimmedSearch) {
      return menuItems.filter(
        (item) =>
          item.name.toLowerCase().includes(trimmedSearch) ||
          item.description.toLowerCase().includes(trimmedSearch) ||
          item.category.toLowerCase().includes(trimmedSearch),
      );
    }

    return menuItems.filter((item) => item.category === selectedCategory);
  }, [menuItems, selectedCategory, searchTerm]);

  const pastStatuses: OrderStatus[] = ["Teslim Alındı", "İptal Edildi", "Ödenmedi"];
  const activeOrders = orders.filter(
    (order) => !pastStatuses.includes(order.status),
  );
  const pastOrders = orders.filter(
    (order) => pastStatuses.includes(order.status),
  );

  const applyCafeteriaChange = (cafe: ActiveCafeteria | null, clearCart: boolean) => {
    if (clearCart) {
      setSelectedItems([]);
      clearCartStorage();
    }
    if (cafe) {
      sessionStorage.setItem(SELECTED_CAFE_STORAGE_KEY, String(cafe.id));
      setSelectedCafeteria(cafe);
    } else {
      sessionStorage.removeItem(SELECTED_CAFE_STORAGE_KEY);
      setSelectedCafeteria(null);
      setMenuItems([]);
    }
  };

  const requestCafeteriaChange = (cafe: ActiveCafeteria | null) => {
    if (cafe?.id === selectedCafeteria?.id) return;

    if (selectedItems.length > 0) {
      const ok = window.confirm(
        "Kafeterya değiştirirsen mevcut sepetin temizlenecek. Devam etmek istiyor musun?",
      );
      if (!ok) return;
      applyCafeteriaChange(cafe, true);
      return;
    }

    applyCafeteriaChange(cafe, false);
  };

  const handleAddToCart = (item: MenuItem) => {
    const existingItem = selectedItems.find((si) => si.item.id === item.id);

    if (existingItem) {
      setSelectedItems(
        selectedItems.map((si) =>
          si.item.id === item.id ? { ...si, quantity: si.quantity + 1 } : si,
        ),
      );
    } else {
      setSelectedItems([...selectedItems, { item, quantity: 1 }]);
    }
  };

  const handleRemoveFromCart = (itemId: number) => {
    const existingItem = selectedItems.find((si) => si.item.id === itemId);

    if (existingItem && existingItem.quantity > 1) {
      setSelectedItems(
        selectedItems.map((si) =>
          si.item.id === itemId ? { ...si, quantity: si.quantity - 1 } : si,
        ),
      );
    } else {
      setSelectedItems(selectedItems.filter((si) => si.item.id !== itemId));
    }
  };

  const totalPrice = selectedItems.reduce(
    (sum, si) => sum + si.item.price * si.quantity,
    0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isUnpaidLimitReached) {
      alert(
        "Ödenmemiş sipariş limitine ulaştınız. Önce kasiyerde bekleyen ödemelerinizi tamamlayın.",
      );
      return;
    }

    if (!selectedCafeteria) {
      alert("Lütfen bir kafeterya seçiniz.");
      return;
    }

    if (selectedItems.length === 0) {
      alert("Lütfen en az bir ürün seçiniz.");
      return;
    }

    if (!selectedTime) {
      alert("Lütfen sipariş saati seçiniz.");
      return;
    }

    setSubmitting(true);
    try {
      await createOrder({
        cafeteriaId: selectedCafeteria.id,
        orderItems: selectedItems.map((si) => ({
          menuItemId: si.item.id,
          quantity: si.quantity,
        })),
        pickupTime: selectedTime,
        note: note || undefined,
      });

      alert("Siparişiniz alındı!");
      setSelectedItems([]);
      setSelectedTime("");
      setNote("");
      clearCartStorage();
      await refreshOrdersAndUnpaid();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.title ||
        "Sipariş oluşturulamadı.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getTimeOptions = useMemo(() => {
    const options: string[] = [];
    for (let h = 9; h <= 17; h++) {
      for (const m of [0, 30]) {
        if (h === 17 && m === 30) break;
        options.push(
          `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
        );
      }
    }

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const remainder = nowMinutes % 30;
    const minMinutes =
      remainder === 0 ? nowMinutes : nowMinutes + (30 - remainder);

    return options.filter((time) => {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m >= minMinutes;
    });
  }, []);

  useEffect(() => {
    if (selectedTime && !getTimeOptions.includes(selectedTime)) {
      setSelectedTime("");
    }
  }, [getTimeOptions, selectedTime]);

  const densityMap = useMemo(() => {
    const map: Record<string, number> = {};
    density.forEach((d) => {
      map[d.time] = d.orderCount;
    });
    return map;
  }, [density]);

  const maxDensity = useMemo(
    () => Math.max(1, ...Object.values(densityMap)),
    [densityMap],
  );

  const getDensityLabel = (count: number) => {
    if (count === 0) return { text: "Sakin", color: "text-emerald-700", bg: "bg-emerald-600" };
    if (count <= Math.ceil(maxDensity * 0.33)) return { text: "Az Yoğun", color: "text-emerald-700", bg: "bg-emerald-600" };
    if (count <= Math.ceil(maxDensity * 0.66)) return { text: "Orta", color: "text-amber-700", bg: "bg-amber-500" };
    return { text: "Yoğun", color: "text-red-700", bg: "bg-red-600" };
  };

  const unpaidWidgetMain =
    unpaidCount === 0
      ? "Ödenmemiş siparişiniz bulunmuyor."
      : unpaidCount === 1
        ? "1 adet ödenmemiş siparişiniz bulunuyor."
        : unpaidCount === 2
          ? "2 adet ödenmemiş siparişiniz bulunuyor."
          : `${unpaidCount} adet ödenmemiş siparişiniz bulunuyor.`;

  const unpaidWidgetSub =
    unpaidCount === 2
      ? "Limit sınırına yaklaşıyorsunuz; kasiyerde bekleyen ödemelerinizi tamamlamanızı öneririz."
      : unpaidCount > 0 && unpaidCount < unpaidLimit
        ? "Bu kayıtlar, teslimatta kasiyer tarafından «ödenmedi» olarak işaretlenen siparişlerdir. Ödemeyi kasiyerde tamamladığınızda liste güncellenir."
        : null;

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex flex-col">
      <header className="w-full border-b bg-[#d71920] text-white">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-2xl font-semibold shrink-0">Kafeterya Sipariş</h1>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:flex-wrap sm:gap-4">
            <div
              className={`rounded-2xl border px-4 py-3 text-sm shadow-md max-w-md transition-colors ${
                unpaidLoading
                  ? "border-white/30 bg-white/10 text-white"
                  : isUnpaidLimitReached
                    ? "border-red-200 bg-white text-red-900"
                    : unpaidCount > 0
                      ? "border-amber-200 bg-amber-50 text-amber-950"
                      : "border-emerald-200/80 bg-white/95 text-emerald-900"
              }`}
              role="status"
              aria-live="polite"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Ödenmemiş siparişlerim
              </p>
              {unpaidLoading ? (
                <p className="text-slate-600 animate-pulse">Yükleniyor…</p>
              ) : (
                <>
                  <p className="font-medium leading-snug">{unpaidWidgetMain}</p>
                  {unpaidCount > 0 && (
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      Toplam açık tutar: {totalDebt.toFixed(2)} ₺
                    </p>
                  )}
                  {unpaidWidgetSub && (
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">{unpaidWidgetSub}</p>
                  )}
                  {unpaidCount > 0 && unpaidSummary && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setShowUnpaidDetails((v) => !v)}
                        className="text-xs font-semibold text-[#d71920] underline underline-offset-2 hover:opacity-90"
                      >
                        {showUnpaidDetails ? "Detayı gizle" : "Detayları göster"}
                      </button>
                      {showUnpaidDetails && (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left space-y-2 max-h-56 overflow-y-auto">
                          <p className="text-[11px] text-slate-500">
                            Hazır bekleyen siparişler bu listede yer almaz; yalnızca kasiyerde
                            ödenmedi kaydı oluşanlar sayılır.
                          </p>
                          {unpaidSummary.orders.map((u) => (
                            <div
                              key={u.id}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-slate-200 pb-2 last:border-0 text-xs"
                            >
                              <div>
                                <span className="font-mono font-medium text-slate-800">
                                  {u.orderNumber || `#${u.id}`}
                                </span>
                                <span className="text-slate-500 ml-2">
                                  {new Date(u.createdAtUtc).toLocaleString("tr-TR")}
                                </span>
                              </div>
                              <span className="font-semibold text-[#d71920]">
                                {u.totalPrice.toFixed(2)} ₺
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <Link
              to={isStudent ? "/ogrenci" : "/ogretim-elemani"}
              className="text-sm underline hover:opacity-90 text-center sm:text-left whitespace-nowrap"
            >
              {isStudent
                ? "Öğrenci anasayfasına dön"
                : "Öğretim elemanı anasayfasına dön"}
            </Link>
          </div>
        </div>
      </header>

      {isUnpaidLimitReached && !unpaidLoading && (
        <div
          className="w-full border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-amber-950 shadow-sm"
          role="alert"
        >
          <p className="max-w-3xl mx-auto text-sm sm:text-base font-medium leading-relaxed">
            Şu anda yeni sipariş oluşturma hakkınız geçici olarak durduruldu: ödenmemiş kayıt
            sınırına ({unpaidLimit} adet) ulaştınız. Önce kasiyerde bu siparişlerin ödemesini
            tamamlayın.
          </p>
          <p className="max-w-3xl mx-auto text-sm mt-2 text-amber-900/90 leading-relaxed">
            Ödeme tamamlandığında durumunuz otomatik güncellenir; ek bir işlem yapmanız gerekmez.
          </p>
        </div>
      )}

      <main className="flex-1 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {!selectedCafeteria ? (
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 md:p-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Kafeterya Seçin
              </h2>
              <p className="text-sm text-slate-600 mb-6">
                Sipariş vermek istediğiniz kafeteryayı seçin.
              </p>
              {cafeteriaListLoading ? (
                <p className="text-slate-500">Kafeteryalar yükleniyor...</p>
              ) : cafeteriaListError ? (
                <p className="text-red-600">{cafeteriaListError}</p>
              ) : activeCafeterias.length === 0 ? (
                <p className="text-slate-500">Aktif kafeterya bulunamadı.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeCafeterias.map((cafe) => (
                    <button
                      key={cafe.id}
                      type="button"
                      onClick={() => requestCafeteriaChange(cafe)}
                      className="text-left rounded-2xl border border-slate-200 p-5 hover:border-[#d71920] hover:bg-red-50 transition"
                    >
                      <h3 className="text-lg font-semibold text-slate-900">{cafe.name}</h3>
                      {cafe.location && (
                        <p className="text-sm text-slate-600 mt-1">{cafe.location}</p>
                      )}
                      {cafe.description && (
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                          {cafe.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Seçili kafeterya</p>
              <h2 className="text-2xl font-semibold text-slate-900">{selectedCafeteria.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="cafeteria-switch" className="text-sm text-slate-600 whitespace-nowrap">
                Kafeterya değiştir
              </label>
              <select
                id="cafeteria-switch"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm min-w-[200px]"
                value={selectedCafeteria.id}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  if (id === 0) {
                    requestCafeteriaChange(null);
                    return;
                  }
                  const cafe = activeCafeterias.find((c) => c.id === id);
                  if (cafe) requestCafeteriaChange(cafe);
                }}
              >
                <option value={0}>Kafeterya listesine dön</option>
                {activeCafeterias.map((cafe) => (
                  <option key={cafe.id} value={cafe.id}>
                    {cafe.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <aside className="xl:col-span-3">
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Menü Kategorileri
              </h2>

              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="space-y-3">
                {categoryList.map((category) => (
                  <button
                    key={category.name}
                    onClick={() => setSelectedCategory(category.name)}
                    className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      selectedCategory === category.name && !searchTerm.trim()
                        ? "border-[#d71920] bg-red-50 text-[#d71920]"
                        : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xl">{category.icon}</span>
                    <span className="font-medium leading-tight">
                      {category.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="xl:col-span-5">
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-semibold text-slate-900">
                  {searchTerm.trim() ? "Arama Sonuçları" : selectedCategory}
                </h2>
                <span className="text-sm text-slate-500">
                  {filteredItems.length} ürün
                </span>
              </div>

              {menuError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
                  {menuError}
                </div>
              ) : menuLoading ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                  Menü yükleniyor...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                  Ürün bulunamadı.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-red-50 text-5xl">
                        {item.image}
                      </div>

                      <div className="flex-1">
                        <h3 className="text-2xl font-semibold text-slate-900">
                          {item.name}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {item.description}
                        </p>

                        <p className="mt-3 text-2xl font-bold text-[#d71920]">
                          {item.price.toFixed(2)} TL
                        </p>

                        <div className="mt-4">
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#d71920] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                          >
                            Sepete Ekle
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-[#d71920] font-bold">
                              +
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="xl:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-5">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Sepetim
              </h2>

              {selectedItems.length === 0 ? (
                <p className="text-slate-500 text-sm">Sepetiniz boş</p>
              ) : (
                <>
                  <div className="space-y-3 mb-5">
                    {selectedItems.map((si) => (
                      <div
                        key={si.item.id}
                        className="rounded-xl bg-slate-50 border border-slate-200 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">
                              {si.item.name}
                            </p>
                            <p className="text-sm text-slate-600">
                              {si.item.price} TL x {si.quantity}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRemoveFromCart(si.item.id)}
                              className="h-8 w-8 rounded-lg bg-red-100 text-[#d71920] font-bold hover:bg-red-200"
                            >
                              -
                            </button>
                            <span className="min-w-[20px] text-center font-medium">
                              {si.quantity}
                            </span>
                            <button
                              onClick={() => handleAddToCart(si.item)}
                              className="h-8 w-8 rounded-lg bg-red-100 text-[#d71920] font-bold hover:bg-red-200"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={handleSubmit}
                    className="space-y-4 border-t pt-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        Toplam
                      </span>
                      <span className="text-2xl font-bold text-[#d71920]">
                        {totalPrice.toFixed(2)} TL
                      </span>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Sipariş Saati
                      </label>
                      <select
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      >
                        <option value="">Saat seçiniz</option>
                        {getTimeOptions.map((time) => {
                          const count = densityMap[time] || 0;
                          const label = getDensityLabel(count);
                          return (
                            <option key={time} value={time}>
                              {time} — {label.text} ({count} sipariş)
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2">
                        Saat Yoğunluğu
                      </label>
                      <div className="bg-white rounded-xl border-2 border-slate-300 p-4 shadow-sm">
                        <div className="flex items-end gap-1.5 h-32">
                          {getTimeOptions.map((time) => {
                            const count = densityMap[time] || 0;
                            const info = getDensityLabel(count);
                            const heightPct = maxDensity > 0 ? Math.max(8, (count / maxDensity) * 100) : 8;
                            return (
                              <div
                                key={time}
                                className="flex-1 flex flex-col items-center justify-end h-full group relative"
                              >
                                <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10">
                                  <span className="bg-slate-900 text-white text-[11px] font-semibold rounded-md px-2 py-1 whitespace-nowrap shadow-lg">
                                    {time} — {count} sipariş
                                  </span>
                                </div>
                                <div
                                  className={`w-full rounded-t-md transition-all shadow-sm ${count === 0 ? "bg-slate-200" : info.bg}`}
                                  style={{ height: `${count === 0 ? 8 : heightPct}%` }}
                                />
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex gap-1.5 mt-2 border-t border-slate-200 pt-2">
                          {getTimeOptions.map((time, i) => (
                            <div key={time} className="flex-1 text-center">
                              <span className="text-[9px] font-bold text-slate-600 leading-none">
                                {i % 2 === 0 ? time : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-3 text-xs font-semibold text-slate-700">
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block shadow-sm" /> Sakin</span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-sm" /> Orta</span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block shadow-sm" /> Yoğun</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Not
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Özel istekleriniz..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || isUnpaidLimitReached}
                      title={
                        isUnpaidLimitReached
                          ? "Ödenmemiş sipariş limiti nedeniyle yeni sipariş verilemez"
                          : undefined
                      }
                      className="w-full rounded-xl bg-[#d71920] py-3 text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting
                        ? "Sipariş gönderiliyor..."
                        : isUnpaidLimitReached
                          ? "Sipariş verilemiyor"
                          : "Siparişi Tamamla"}
                    </button>
                    {isUnpaidLimitReached && !unpaidLoading && (
                      <p className="text-xs text-center text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
                        Kasiyerde bekleyen ödenmemiş kayıtlarınızı kapattığınızda buradan tekrar sipariş
                        verebilirsiniz. Durum otomatik güncellenir.
                      </p>
                    )}
                  </form>
                </>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-5">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Aktif Siparişlerim
              </h2>

              {ordersLoading ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                  Yükleniyor...
                </div>
              ) : activeOrders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                  Aktif sipariş bulunmuyor.
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {activeOrders
                      .slice(activeOrdersPage * 3, activeOrdersPage * 3 + 3)
                      .map((order) => (
                        <div
                          key={order.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <p className="text-sm text-slate-500">
                                Sipariş #{order.id}
                              </p>
                              <p className="text-sm text-slate-500">
                                {order.createdAt} • Teslim: {order.selectedTime}
                              </p>
                              {order.cafeteriaName && (
                                <p className="text-sm text-slate-600 mt-1">
                                  {order.cafeteriaName}
                                </p>
                              )}
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                statusStyles[order.status] || "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>

                          <div className="space-y-1 mb-3">
                            {order.items.map((item, index) => (
                              <p
                                key={`${order.id}-${item.menuItemId}-${index}`}
                                className="text-sm text-slate-700"
                              >
                                <span className="font-medium">{item.name}</span> x{" "}
                                {item.quantity}
                              </p>
                            ))}
                          </div>

                          {order.note && (
                            <p className="mb-3 text-sm text-slate-600">
                              <span className="font-medium">Not:</span> {order.note}
                            </p>
                          )}

                          <span className="font-semibold text-slate-900">
                            {order.totalPrice.toFixed(2)} TL
                          </span>
                        </div>
                      ))}
                  </div>
                  {activeOrders.length > 3 && (
                    <div className="flex items-center justify-center gap-3 mt-4">
                      <button
                        onClick={() => setActiveOrdersPage((p) => Math.max(0, p - 1))}
                        disabled={activeOrdersPage === 0}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        ← Önceki
                      </button>
                      <span className="text-sm text-slate-500">
                        {activeOrdersPage + 1} / {Math.ceil(activeOrders.length / 3)}
                      </span>
                      <button
                        onClick={() =>
                          setActiveOrdersPage((p) =>
                            Math.min(Math.ceil(activeOrders.length / 3) - 1, p + 1),
                          )
                        }
                        disabled={activeOrdersPage >= Math.ceil(activeOrders.length / 3) - 1}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Sonraki →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-5">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Geçmiş Siparişlerim
              </h2>

              {ordersLoading ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                  Yükleniyor...
                </div>
              ) : pastOrders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                  Geçmiş sipariş bulunmuyor.
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {pastOrders
                      .slice(pastOrdersPage * 3, pastOrdersPage * 3 + 3)
                      .map((order) => (
                        <div
                          key={order.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <p className="text-sm text-slate-500">
                                Sipariş #{order.id}
                              </p>
                              <p className="text-sm text-slate-500">
                                {order.createdAt} • Teslim: {order.selectedTime}
                              </p>
                              {order.cafeteriaName && (
                                <p className="text-sm text-slate-600 mt-1">
                                  {order.cafeteriaName}
                                </p>
                              )}
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                statusStyles[order.status] || "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>

                          <div className="space-y-1 mb-3">
                            {order.items.map((item, index) => (
                              <p
                                key={`${order.id}-${item.menuItemId}-${index}`}
                                className="text-sm text-slate-700"
                              >
                                <span className="font-medium">{item.name}</span> x{" "}
                                {item.quantity}
                              </p>
                            ))}
                          </div>

                          {order.note && (
                            <p className="mb-3 text-sm text-slate-600">
                              <span className="font-medium">Not:</span> {order.note}
                            </p>
                          )}

                          <span className="font-semibold text-slate-900">
                            {order.totalPrice.toFixed(2)} TL
                          </span>
                        </div>
                      ))}
                  </div>
                  {pastOrders.length > 3 && (
                    <div className="flex items-center justify-center gap-3 mt-4">
                      <button
                        onClick={() => setPastOrdersPage((p) => Math.max(0, p - 1))}
                        disabled={pastOrdersPage === 0}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        ← Önceki
                      </button>
                      <span className="text-sm text-slate-500">
                        {pastOrdersPage + 1} / {Math.ceil(pastOrders.length / 3)}
                      </span>
                      <button
                        onClick={() =>
                          setPastOrdersPage((p) =>
                            Math.min(Math.ceil(pastOrders.length / 3) - 1, p + 1),
                          )
                        }
                        disabled={pastOrdersPage >= Math.ceil(pastOrders.length / 3) - 1}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Sonraki →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CafeteriaOrderPage;
