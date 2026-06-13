# داریا دنگ

اپ وب برای مدیریت خرج‌های مشترک تیم: ثبت خرج، تقسیم مساوی یا سفارشی، پیگیری بدهی/طلب، ثبت‌نام با ایمیل و پنل ادمین گروه.

## تکنولوژی

- Next.js 16 (App Router) + TypeScript
- Prisma ORM + PostgreSQL 16
- Tailwind CSS
- Docker + Docker Compose (استقرار پیشنهادی)

---

## راهنمای استقرار برای DevOps

### پیش‌نیازها


| مورد           | نسخه / توضیح                              |
| -------------- | ----------------------------------------- |
| Docker         | 24+                                       |
| Docker Compose | v2+                                       |
| Git            | دسترسی clone به ریپو                      |
| پورت           | پیش‌فرض `3000` (قابل تغییر با `APP_PORT`) |
| RAM            | حداقل ~1GB برای build اول (Next.js)       |


### استقرار سریع (پیشنهادی)

```bash
git clone <REPO_URL>
cd daria-food
cp .env.example .env
# مقادیر .env را ویرایش کنید (بخش «متغیرهای محیطی»)
docker compose up --build -d
```

بعد از بالا آمدن:

```text
http://<SERVER_IP>:3000
```

- مایگریشن دیتابیس **خودکار** است (`prisma migrate deploy` داخل کانتینر `app`)
- دیتابیس PostgreSQL داخل همان `docker-compose` بالا می‌آید
- داده‌ها در volume با نام `postgres_data` نگه داشته می‌شوند

### پورت دلخواه

```bash
APP_PORT=8080 docker compose up --build -d
```

### به‌روزرسانی نسخه

```bash
git pull
docker compose up --build -d
```

مایگریشن‌های جدید در استارت کانتینر `app` اعمال می‌شوند.

---

## معماری Docker

```text
┌─────────────────────────────────────┐
│  app (Next.js standalone)           │
│  - build از Dockerfile              │
│  - پورت: 3000 داخل کانتینر        │
│  - migrate deploy در استارت       │
└──────────────┬──────────────────────┘
               │ DATABASE_URL
               ▼
┌─────────────────────────────────────┐
│  postgres:16-alpine                 │
│  - DB: daria_dong                   │
│  - volume: postgres_data            │
└─────────────────────────────────────┘
```

فایل‌های مهم:


| فایل                 | نقش                                   |
| -------------------- | ------------------------------------- |
| `Dockerfile`         | Multi-stage build؛ خروجی `standalone` |
| `docker-compose.yml` | سرویس‌های `app` + `postgres`          |
| `.env`               | تنظیمات محرمانه (در git نیست)         |
| `prisma/migrations/` | مایگریشن‌های دیتابیس                  |


---

## متغیرهای محیطی

روی سرور فایل `.env` بسازید (از `.env.example`):

```bash
cp .env.example .env
```


| متغیر                    | الزامی           | توضیح                                                                                                           |
| ------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | در Docker خودکار | در `docker-compose` برای سرویس `app` روی `postgres` داخلی ست می‌شود. اگر DB خارجی دارید، این مقدار را عوض کنید. |
| `SESSION_SECRET`         | **بله**          | رشته تصادفی بلند برای امضای کوکی‌ها. در production حتماً عوض شود.                                               |
| `ADMIN_PASSWORD`         | **بله**          | رمز ورود ادمین مرکزی (`/admin/login`)                                                                           |
| `APP_SHARED_PASSWORD`    | توصیه            | رمز مشترک ورود اعضای گروه (legacy)                                                                              |
| `USER_FALLBACK_PASSWORD` | اختیاری          | رمز جایگزین برای کاربرانی که رمز شخصی ندارند                                                                    |
| `SMTP_HOST`              | برای ایمیل       | مثلاً `smtp.gmail.com`                                                                                          |
| `SMTP_PORT`              | برای ایمیل       | معمولاً `587`                                                                                                   |
| `SMTP_SECURE`            | برای ایمیل       | `false` برای پورت 587، `true` برای 465                                                                          |
| `SMTP_USER`              | برای ایمیل       | آدرس ایمیل فرستنده                                                                                              |
| `SMTP_PASS`              | برای ایمیل       | App Password (مثلاً Gmail)                                                                                      |
| `EMAIL_FROM`             | برای ایمیل       | مثلاً `Daria Dong <noreply@example.com>`                                                                        |
| `APP_PORT`               | اختیاری          | پورت host؛ پیش‌فرض `3000`                                                                                       |


> **ایمیل:** بدون تنظیم `SMTP_`* و `EMAIL_FROM`، ثبت‌نام با کد ایمیل در production کار نمی‌کند.

> **امنیت:** مقادیر پیش‌فرض داخل `docker-compose.yml` (رمز postgres، `ADMIN_PASSWORD` و ...) فقط برای توسعه است. در production حتماً عوض شوند.

---

## چک‌لیست Production

- [ ] `SESSION_SECRET` تصادفی و قوی
- [ ] `ADMIN_PASSWORD` عوض شده
- [ ] رمز PostgreSQL در `docker-compose.yml` عوض شده (یا DB مدیریت‌شده جدا)
- [ ] SMTP برای ارسال ایمیل ثبت‌نام تنظیم شده
- [ ] HTTPS پشت Nginx / Traefik / Caddy
- [ ] بکاپ دوره‌ای volume `postgres_data`
- [ ] `docker compose down -v` **اجرا نشود** (دیتابیس پاک می‌شود)

### HTTPS (پیشنهاد)

اپ را مستقیم expose نکنید؛ پشت reverse proxy:

```text
Internet → Nginx (443) → app:3000
```

نمونه متغیر برای پروکسی: `proxy_pass http://127.0.0.1:3000;`

---

## مسیرهای مهم اپ


| مسیر                 | کاربرد                         |
| -------------------- | ------------------------------ |
| `/login`             | ورود / ثبت‌نام کاربران (ایمیل) |
| `/account`           | حساب کاربری و گروه‌ها          |
| `/admin/login`       | ورود ادمین مرکزی               |
| `/admin`             | ساخت و مدیریت گروه‌ها          |
| `/{group}/dashboard` | داشبورد عضو گروه               |
| `/{group}/expenses`  | لیست خرج‌ها                    |


---

## عملیات روی سرور

```bash
# لاگ‌ها
docker compose logs -f app
docker compose logs -f postgres

# وضعیت
docker compose ps

# توقف (بدون حذف دیتا)
docker compose down

# seed اختیاری (داده mock نمی‌سازد)
docker compose exec app npm run seed

# خالی کردن عمدی دیتابیس (خطرناک)
docker compose exec app npm run db:clear
```

### بکاپ دیتابیس

```bash
docker compose exec postgres pg_dump -U postgres daria_dong > backup.sql
```

### بازیابی

```bash
cat backup.sql | docker compose exec -T postgres psql -U postgres daria_dong
```

---

## عیب‌یابی


| مشکل            | راه‌حل                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| اپ بالا نمی‌آید | `docker compose logs app` — معمولاً خطای migrate یا env                |
| ایمیل نمی‌رود   | `SMTP_*` را در `.env` چک کنید؛ برای Gmail از App Password استفاده کنید |
| 502 از پروکسی   | مطمئن شوید `app` روی پورت درست listen می‌کند                           |
| دیتا پاک شد     | احتمالاً `docker compose down -v` زده شده                              |
| build کند است   | اولین build طبیعی است؛ بعدی‌ها cache می‌شوند                           |


---

## توسعه محلی (برای تیم dev)

```bash
npm install
npm run prisma:generate
npm run migrate:dev
npm run dev
```

آدرس: `http://localhost:3000`

```bash
npm run type-check
npm run build
npm run lint
```

### Docker محلی

```bash
docker compose up --build
```

---

## مهاجرت‌ها

توسعه:

```bash
npm run migrate:dev
```

سرور / Docker (خودکار در استارت app):

```bash
npm run migrate:deploy
```

---

## یادداشت‌های محصول

- حذف خرج **نرم** است (`status = CANCELLED`)
- خرج **مساوی**: مبلغ کل تقسیم می‌شود
- خرج **سفارشی**: هر عضو سهم خودش را وارد می‌کند؛ ادمین گروه سهم مهمان‌ها را تعیین می‌کند
- مهمان فقط در سطح هر خرج است، نه لیست ثابت گروه

