# دنگ یار

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
| RAM            | 512MB تا 1GB برای اجرای کم‌ترافیک؛ build در GitHub انجام می‌شود |


### استقرار Production روی سرور ضعیف

ایمیج production توسط GitHub Actions ساخته و در GHCR منتشر می‌شود. سرور فقط ایمیج آماده را pull می‌کند و دیگر Next.js را build نمی‌کند.

برای نصب تازه:

```bash
git clone https://github.com/emadcheshmazar/dong-yar.git
cd dong-yar
test -f .env || cp .env.example .env
```

قبل از اولین انتقال، از دیتابیس فعلی بکاپ بگیرید:

```bash
mkdir -p backups
docker compose exec -T postgres pg_dump -U postgres daria_dong | gzip > "backups/dongyar-before-migration-$(date +%F-%H%M).sql.gz"
```

نام volume فعلی دیتابیس را در حالی که کانتینر فعلی هنوز وجود دارد پیدا کنید:

```bash
CURRENT_VOLUME=$(docker inspect "$(docker compose ps -q postgres)" --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}')
echo "$CURRENT_VOLUME"
```

مقدار چاپ‌شده را در `.env` قرار دهید. برای دیتابیس فعلی، رمز باید همان رمز قبلی PostgreSQL باشد:

```dotenv
POSTGRES_VOLUME_NAME=نام-volume-فعلی
POSTGRES_USER=postgres
POSTGRES_PASSWORD=رمز-فعلی-دیتابیس
POSTGRES_DB=daria_dong
```

اگر نصب کاملاً جدید است و دیتای قبلی ندارید:

```bash
docker volume create dongyar_postgres_data
```

سپس `POSTGRES_VOLUME_NAME=dongyar_postgres_data` را در `.env` بگذارید و production را بالا بیاورید:

```bash
git pull
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

اگر پکیج GHCR خصوصی است، قبل از `pull` یک‌بار با GitHub PAT دارای دسترسی `read:packages` لاگین کنید:

```bash
echo "$GHCR_PAT" | docker login ghcr.io -u emadcheshmazar --password-stdin
```

بعد از بالا آمدن:

```text
http://<SERVER_IP>:3000
```

- مایگریشن دیتابیس **خودکار** است (`prisma migrate deploy` داخل کانتینر `app`)
- build روی GitHub انجام می‌شود و RAM سرور را درگیر نمی‌کند
- volume دیتابیس در production خارجی است و تغییر پوشه یا نام Compose آن را عوض نمی‌کند
- `docker compose down -v` نمی‌تواند external volume را حذف کند؛ با این حال `docker volume rm/prune` همچنان ممنوع است

### پورت دلخواه

```bash
APP_PORT=8080 docker compose -f docker-compose.prod.yml up -d
```

### به‌روزرسانی نسخه

```bash
git pull
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

مایگریشن‌های جدید در استارت کانتینر `app` اعمال می‌شوند.

---

## معماری Docker

```text
┌─────────────────────────────────────┐
│  app (Next.js standalone)           │
│  - image آماده از GHCR              │
│  - پورت: 3000 داخل کانتینر        │
│  - migrate deploy در استارت       │
└──────────────┬──────────────────────┘
               │ DATABASE_URL
               ▼
┌─────────────────────────────────────┐
│  postgres:16-alpine                 │
│  - DB: daria_dong                   │
│  - external volume ثابت             │
└─────────────────────────────────────┘
```

فایل‌های مهم:


| فایل                 | نقش                                   |
| -------------------- | ------------------------------------- |
| `Dockerfile`         | Multi-stage build؛ خروجی `standalone` |
| `docker-compose.yml` | build و اجرای محلی                    |
| `docker-compose.prod.yml` | اجرای سبک production بدون build |
| `.github/workflows/docker-publish.yml` | build و انتشار ایمیج در GHCR |
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
| `POSTGRES_VOLUME_NAME`   | **بله**          | نام volume موجود و پایدار دیتابیس روی سرور                                                                      |
| `POSTGRES_PASSWORD`      | **بله**          | رمز PostgreSQL؛ برای URL داخلی از حروف/عدد و کاراکترهای URL-safe استفاده شود                                    |
| `APP_MEMORY_LIMIT`       | اختیاری          | سقف RAM اپ؛ پیش‌فرض `256m`                                                                                       |
| `POSTGRES_MEMORY_LIMIT`  | اختیاری          | سقف RAM PostgreSQL؛ پیش‌فرض `192m`                                                                               |
| `NODE_MAX_OLD_SPACE_SIZE` | اختیاری         | سقف heap نود؛ پیش‌فرض `160` مگابایت                                                                              |
| `SESSION_SECRET`         | **بله**          | رشته تصادفی بلند برای امضای کوکی‌ها. در production حتماً عوض شود.                                               |
| `ADMIN_PASSWORD`         | **بله**          | رمز ورود ادمین مرکزی (`/admin/login`)                                                                           |
| `APP_SHARED_PASSWORD`    | توصیه            | رمز مشترک ورود اعضای گروه (legacy)                                                                              |
| `USER_FALLBACK_PASSWORD` | اختیاری          | رمز جایگزین برای کاربرانی که رمز شخصی ندارند                                                                    |
| `SMTP_HOST`              | برای ایمیل       | مثلاً `smtp.gmail.com`                                                                                          |
| `SMTP_PORT`              | برای ایمیل       | معمولاً `587`                                                                                                   |
| `SMTP_SECURE`            | برای ایمیل       | `false` برای پورت 587، `true` برای 465                                                                          |
| `SMTP_USER`              | برای ایمیل       | آدرس ایمیل فرستنده                                                                                              |
| `SMTP_PASS`              | برای ایمیل       | App Password (مثلاً Gmail)                                                                                      |
| `EMAIL_FROM`             | برای ایمیل       | مثلاً `Dong Yar <noreply@example.com>`                                                                          |
| `APP_PORT`               | اختیاری          | پورت host؛ پیش‌فرض `3000`                                                                                       |


> **ایمیل:** بدون تنظیم `SMTP_`* و `EMAIL_FROM`، ثبت‌نام با کد ایمیل در production کار نمی‌کند.

> **امنیت:** مقادیر پیش‌فرض داخل `docker-compose.yml` (رمز postgres، `ADMIN_PASSWORD` و ...) فقط برای توسعه است. در production حتماً عوض شوند.

---

## چک‌لیست Production

- [ ] `SESSION_SECRET` تصادفی و قوی
- [ ] `ADMIN_PASSWORD` عوض شده
- [ ] `POSTGRES_VOLUME_NAME` دقیقاً به volume فعلی دیتابیس اشاره می‌کند
- [ ] رمز PostgreSQL امن است (یا DB مدیریت‌شده جدا استفاده می‌شود)
- [ ] SMTP برای ارسال ایمیل ثبت‌نام تنظیم شده
- [ ] HTTPS پشت Nginx / Traefik / Caddy
- [ ] بکاپ دوره‌ای و تست بازیابی فعال است
- [ ] `docker volume prune` و `docker volume rm` برای volume دیتابیس اجرا نمی‌شود

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
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f postgres

# وضعیت
docker compose -f docker-compose.prod.yml ps

# توقف (بدون حذف دیتا)
docker compose -f docker-compose.prod.yml down

# seed اختیاری (داده mock نمی‌سازد)
docker compose -f docker-compose.prod.yml exec app npm run seed

# خالی کردن عمدی دیتابیس (خطرناک)
docker compose -f docker-compose.prod.yml exec app npm run db:clear
```

### بکاپ دیتابیس

```bash
mkdir -p backups
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres daria_dong | gzip > "backups/dongyar-$(date +%F-%H%M).sql.gz"
```

### بازیابی

```bash
gunzip -c backup.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres daria_dong
```

---

## عیب‌یابی


| مشکل            | راه‌حل                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| اپ بالا نمی‌آید | `docker compose logs app` — معمولاً خطای migrate یا env                |
| ایمیل نمی‌رود   | `SMTP_*` را در `.env` چک کنید؛ برای Gmail از App Password استفاده کنید |
| 502 از پروکسی   | مطمئن شوید `app` روی پورت درست listen می‌کند                           |
| دیتا خالی دیده می‌شود | `POSTGRES_VOLUME_NAME` را با mount کانتینر قبلی مقایسه کنید؛ volume اشتباه یعنی دیتابیس تازه |
| اپ بعد از restart بالا نمی‌آید | `docker compose -f docker-compose.prod.yml logs app postgres` را بررسی کنید |
| ایمیج pull نمی‌شود | visibility پکیج GHCR یا لاگین `docker login ghcr.io` را بررسی کنید |
| build سرور را از پا می‌اندازد | در production فقط compose مخصوص production را اجرا کنید؛ این فایل build ندارد |


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
