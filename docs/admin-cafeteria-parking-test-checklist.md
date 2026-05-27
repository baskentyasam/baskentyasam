# Manuel Test Checklist — Merkezi Yönetim (Kafeterya / Otopark)

Bu liste Aşama 9 doğrulaması içindir. Her maddeyi işaretleyerek ilerleyin.

## Ön koşullar

- [ ] Backend çalışıyor (`dotnet run`)
- [ ] Frontend çalışıyor (`npm start`)
- [ ] Migration uygulandı (`dotnet ef database update`)
- [ ] Seed: `systemadmin@baskentyasam.com` / `123456`
- [ ] Seed kafeler: Pergel, Sanat, Hazırlık (Mühendislik Kafe **olmamalı**)
- [ ] Seed otoparklar: Hazırlık, Mühendislik, Ana Giriş

## Login ve yönlendirme

| Rol | Hesap | Beklenen rota |
|-----|-------|----------------|
| SuperAdmin | systemadmin@baskentyasam.com / 123456 | `/admin` |
| SubAdmin | SuperAdmin’in oluşturduğu alt admin | `/admin/panel` → scope sayfası |
| Staff/Kasiyer | kasiyer / 123456 | `/kasiyer/siparisler` |
| Student | ali.ogrenci@baskent.edu.tr / baskent123 | `/ogrenci` |
| Teacher | hoca@baskent.edu.tr / baskent123 | `/ogretim-elemani` |
| Legacy Admin | admin@baskent.edu.tr (pasif) | Giriş reddedilmeli |

## Güvenlik (403 / Forbid)

- [ ] Cafeteria SubAdmin: kendi `cafeteriaId` → 200
- [ ] Cafeteria SubAdmin: başka `cafeteriaId` URL → 403
- [ ] Parking SubAdmin: kendi `parkingLotId` → 200
- [ ] Parking SubAdmin: başka `parkingLotId` URL → 403
- [ ] SubAdmin → `/api/admin/sub-admins` → 403
- [ ] Student/Teacher/Staff → `/api/admin/*` → 403
- [ ] SubAdmin URL ile `/admin/cafeterias` → frontend `/admin/panel` yönlendirmesi

## SuperAdmin

### Alt Admin
- [ ] Liste, oluşturma, pasifleştirme
- [ ] Cafeteria scope: gerçek kafeler dropdown’da
- [ ] Parking scope: gerçek otoparklar dropdown’da
- [ ] Library/Appointment oluşturma engelli

### Kafeterya
- [ ] CRUD, pasifleştirme
- [ ] Yeni kafe → öğrenci/kasiyer/scope listelerinde görünür
- [ ] Menü ürünü ekle/düzenle/pasifleştir → öğrenci menüsüne yansır

### Otopark
- [ ] CRUD, pasifleştirme
- [ ] Metrik güncelleme (capacity, occupancy)
- [ ] Yeni otopark → `/otopark` listesinde görünür

## SubAdmin (örnek)

### Cafeteria (Pergel)
- [ ] Menü yönetimi çalışır
- [ ] Kafe meta (ad/konum/pasif) değiştirilemez
- [ ] Kasiyer ekranına gitmez

### Parking (Mühendislik)
- [ ] Metrik güncelleme çalışır
- [ ] Name/location/isActive değiştirilemez

## Öğrenci / Öğretim elemanı — Kafeterya

- [ ] `/kafeterya` aktif kafe listesi (backend)
- [ ] Kafe seç → menü filtrelenir
- [ ] Sepet doluyken kafe değiştir → onay/iptal
- [ ] Sipariş `cafeteriaId` ile oluşur
- [ ] Pasif ürün/kafe sipariş edilemez
- [ ] Sipariş geçmişinde `cafeteriaName`

## Kasiyer

- [ ] Kafe dropdown (backend)
- [ ] Tüm / tek kafe filtresi
- [ ] Kartta `cafeteriaName`
- [ ] approve → paid / notpaid / cancel
- [ ] Borç paneli kafe filtresi
- [ ] settle-all seçili kafeye göre

## Otopark kullanıcı

- [ ] Dashboard kartı → `/otopark`
- [ ] Aktif otoparklar, seçim, metrikler
- [ ] capacity=0 UI patlamaz
- [ ] Yenile → admin güncellemesi görünür
- [ ] Pasif otopark listede yok

## Build

```bash
cd backend && dotnet build
cd frontend && npm run build
```
