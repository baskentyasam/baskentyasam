# Production Deployment

Bu rehber, Başkent Yaşam platformunu production ortamına güvenli şekilde almak içindir.

## Ön koşullar

- Docker ve Docker Compose
- `.env` dosyası (`.env.example` kopyası, **gerçek secret'larla** doldurulmuş)
- Gmail App Password veya SMTP bilgileri (**repoda tutulmaz**)

## Hızlı başlangıç (Production Docker)

```bash
cp .env.example .env
# .env içinde en az şunları ayarlayın:
# ASPNETCORE_ENVIRONMENT=Production
# POSTGRES_PASSWORD, JWT_SECRET_KEY, FRONTEND_URL, API_BASE_URL
# SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD (min 12 karakter)
# SMTP_USERNAME, SMTP_PASSWORD

docker compose -f docker-compose.prod.yml up --build -d
```

## Güvenlik davranışları

### Seed hesapları

| Ortam | Davranış |
|-------|----------|
| **Development** | Demo öğrenci/öğretmen/kasiyer/SuperAdmin (`baskent123`, `123456`) seed edilir |
| **Production** | Demo kullanıcı seed **edilmez**. SuperAdmin yalnızca `SUPERADMIN_*` env ile oluşturulur |

- Mevcut production DB'deki kullanıcılar **silinmez**
- Legacy Admin hesapları pasif kalır
- Kafeterya, otopark, kütüphane, fakülte/bölüm altyapı seed'i idempotent olarak devam eder

### SuperAdmin

Production'da ilk SuperAdmin:

```env
SUPERADMIN_EMAIL=admin@yourdomain.com
SUPERADMIN_PASSWORD=guclu-sifre-en-az-12-karakter
SUPERADMIN_NAME=Sistem Yöneticisi
```

- Şifre zayıfsa veya env eksikse: **demo SuperAdmin oluşturulmaz** (startup devam eder, konsola uyarı yazılır)
- Hesap zaten varsa şifre **üzerine yazılmaz**

### Veritabanı portu

- **Local** (`docker-compose.yml`): `5433:5432` (pgAdmin/debug için)
- **Production** (`docker-compose.prod.yml`): DB portu host'a **açılmaz**

### CORS

- Development: localhost origin'leri
- Production: yalnızca `FRONTEND_URL` (zorunlu env)

### JWT

- Production varsayılan: **120 dakika** (`JWT_EXPIRES_MINUTES`)
- Development: `appsettings.Development.json` → 1440 dakika

### Rate limiting

Auth endpoint'leri IP başına dakikada 30 istek (`login`, `register`, `forgot-password`, `reset-password`).

## Reverse proxy (TLS)

Uygulama container'ı nginx ile frontend + `/api` proxy sunar. Dış TLS için örnek:

```
Internet → Caddy/Nginx (443) → localhost:3000 (web container)
```

Production'da `FRONTEND_URL` gerçek HTTPS domain olmalıdır.

## Local development

Local akış değişmedi:

```bash
cp .env.example .env
# ASPNETCORE_ENVIRONMENT=Development
docker compose up --build
```

## Gmail App Password

- Kodda veya git'te **tutulmaz**
- Yalnızca `.env` / sunucu secret manager
- Sızıntı şüphesinde hemen iptal edip yenileyin
