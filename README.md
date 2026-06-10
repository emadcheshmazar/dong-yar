# داریا دنگ

یک اپ کوچک و دوستانه برای مدیریت خرج‌های مشترک شرکت: صبحانه، نان، شیرینی، قهوه و خرج‌های روزمره. این پروژه حسابداری نیست؛ فقط وضعیت دنگ‌ها را با اعتماد ثبت می‌کند.

## تکنولوژی

- Next.js App Router + TypeScript
- Prisma ORM + PostgreSQL
- Tailwind CSS با کامپوننت‌های سبک shadcn/ui
- Docker و Docker Compose

## متغیرهای محیطی

از `.env.example` کپی بگیرید:

```bash
cp .env.example .env
```

متغیرها:

- `DATABASE_URL`: آدرس PostgreSQL
- `SESSION_SECRET`: رشته بلند و تصادفی برای امضای کوکی
- `APP_SHARED_PASSWORD`: رمز ورود برنامه
- `APP_SHARED_PASSWORD_HASH`: جایگزین امن‌تر برای رمز خام، در صورت نیاز
- `ADMIN_PASSWORD`: رمز ورود پنل ادمین
- `ADMIN_PASSWORD_HASH`: جایگزین امن‌تر برای رمز خام ادمین، در صورت نیاز

## اجرای محلی

```bash
npm install
npm run prisma:generate
npm run migrate:dev
npm run dev
```

آدرس پیش‌فرض: `http://localhost:3000`

رمز ورود پیش‌فرض: `dong123456`

ورود کاربران گروهی است. ادمین اصلی باید اول از `/admin` گروه را بسازد و همان لحظه username/password ادمین همان گروه را تعیین کند. بعد ادمین گروه از مسیر `/{group}/admin/login` فقط کاربران و خرج‌های همان گروه را مدیریت می‌کند. کاربرها در صفحه اصلی فقط شناسه گروه، مثل `marketing`، را وارد می‌کنند و بعد وارد صفحه لاگین همان گروه می‌شوند.

اگر برای یک کاربر در پنل رمز اختصاصی ثبت شود، همان رمز برای ورود آن کاربر استفاده می‌شود. اگر رمز اختصاصی نداشته باشد، رمز مشترک برنامه همچنان کار می‌کند.

رمز ادمین اصلی در Docker به صورت پیش‌فرض `1qaz@WSX` است و باید در production عوض شود.

## Docker

```bash
docker compose up --build
```

برای پورت داخلی دلخواه:

```bash
APP_PORT=8080 docker compose up --build
```

بعد از بالا آمدن سرویس‌ها، اجرای seed دیتای mock نمی‌سازد و داده‌های موجود را نگه می‌دارد:

```bash
docker compose exec app npm run seed
```

اگر عمدا خواستید دیتابیس را کامل خالی کنید:

```bash
docker compose exec app npm run db:clear
```

پنل ادمین:

```text
http://localhost:3000/admin
```

پنل ادمین هر گروه:

```text
http://localhost:3000/{group}/admin/login
```

## مهاجرت‌ها و seed

ساخت migration در توسعه:

```bash
npm run migrate:dev
```

اجرای migration در سرور:

```bash
npm run migrate:deploy
```

اجرای seed بدون ساخت mock data و بدون پاک کردن داده‌های موجود:

```bash
npm run seed
```

خالی کردن عمدی همه داده‌ها:

```bash
npm run db:clear
```

## یادداشت استقرار داخلی

- `SESSION_SECRET` و `ADMIN_PASSWORD` را در production حتما عوض کنید.
- اگر از `APP_SHARED_PASSWORD_HASH` استفاده می‌کنید، `APP_SHARED_PASSWORD` را حذف کنید.
- دیتابیس PostgreSQL باید قبل از اجرای app در دسترس باشد.
- برای نگه داشتن دیتابیس Docker، از `docker compose down -v` استفاده نکنید؛ این دستور volume دیتابیس را حذف می‌کند.
- حذف خرج به صورت نرم انجام می‌شود و status به `CANCELLED` تغییر می‌کند.
