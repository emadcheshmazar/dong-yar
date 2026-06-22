# دنگ یار

اپ مدیریت خرج‌های مشترک با Next.js، Prisma و PostgreSQL.

## استقرار روی سرور

سرور اپ را build نمی‌کند. GitHub Actions ایمیج آماده را می‌سازد و سرور فقط آن را اجرا می‌کند.

### انتقال امن دیتابیس فعلی

این مرحله را فقط یک‌بار و قبل از اولین اجرای نسخه جدید انجام دهید.

نام کانتینر PostgreSQL همین اپ را پیدا کنید:

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' | grep postgres
POSTGRES_CONTAINER=نام-کانتینر-postgres-همین-اپ
echo "$POSTGRES_CONTAINER"
```

از دیتابیس بکاپ بگیرید:

```bash
mkdir -p backups
docker exec "$POSTGRES_CONTAINER" pg_dump -U postgres daria_dong \
  | gzip > "backups/dongyar-$(date +%F-%H%M).sql.gz"
```

نام volume فعلی را پیدا کنید:

```bash
CURRENT_VOLUME=$(docker inspect "$POSTGRES_CONTAINER" \
  --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}')
echo "$CURRENT_VOLUME"
```

مقادیر زیر را در `.env` قرار دهید. برای دیتابیس موجود، `POSTGRES_PASSWORD` باید همان رمز قبلی باشد؛ در compose قدیمی مقدار آن `postgres` بود.

```dotenv
POSTGRES_VOLUME_NAME=نام-volume-نمایش-داده‌شده
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=daria_dong

APP_MEMORY_LIMIT=256m
POSTGRES_MEMORY_LIMIT=192m
NODE_MAX_OLD_SPACE_SIZE=160
APP_PORT=3000
```

سپس نسخه جدید را اجرا کنید:

```bash
git pull
docker compose pull
docker compose up -d
docker compose ps
```

اگر نصب کاملاً جدید است و دیتای قبلی ندارید:

```bash
docker volume create dongyar_postgres_data
```

و در `.env` بنویسید:

```dotenv
POSTGRES_VOLUME_NAME=dongyar_postgres_data
```

## به‌روزرسانی‌های بعدی

```bash
git pull
docker compose pull
docker compose up -d
```

از `docker compose up --build` روی سرور استفاده نکنید.

## ماندگاری دیتابیس

دیتابیس روی external Docker volume ذخیره می‌شود و با restart، خاموش‌شدن سرور، rebuild یا `docker compose down -v` حذف نمی‌شود.

این دستورات را برای volume دیتابیس اجرا نکنید:

```bash
docker volume rm ...
docker volume prune
```

اگر `POSTGRES_VOLUME_NAME` تنظیم نشده باشد، Compose عمداً اجرا نمی‌شود تا تصادفی یک دیتابیس خالی ساخته نشود.

## دستورات ضروری

```bash
# وضعیت
docker compose ps

# لاگ‌ها
docker compose logs -f app
docker compose logs -f postgres

# restart بدون حذف دیتا
docker compose restart

# توقف بدون حذف دیتا
docker compose down

# seed؛ دیتای موجود را پاک نمی‌کند
docker compose exec app npm run seed
```

### بکاپ

```bash
mkdir -p backups
docker compose exec -T postgres pg_dump -U postgres daria_dong \
  | gzip > "backups/dongyar-$(date +%F-%H%M).sql.gz"
```

### بازیابی

```bash
gunzip -c backup.sql.gz \
  | docker compose exec -T postgres psql -U postgres daria_dong
```

## توسعه محلی

```bash
npm install
npm run migrate:dev
npm run dev
```

تست‌ها:

```bash
npm run type-check
npm run lint
npm run build
```
