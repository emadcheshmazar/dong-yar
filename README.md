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

## اجرای محلی

```bash
npm install
npm run prisma:generate
npm run migrate:dev
npm run dev
```

آدرس پیش‌فرض: `http://localhost:3000`

رمز ورود پیش‌فرض: `dong123456`

اگر دیتابیس خالی باشد، اولین ورود با هر نام کاربری دلخواه، همان کاربر را به عنوان اولین عضو ثابت می‌سازد. بعد از آن فقط اعضای ثبت‌شده می‌توانند وارد شوند.

## Docker

```bash
docker compose up --build
```

برای پورت داخلی دلخواه:

```bash
APP_PORT=8080 docker compose up --build
```

بعد از بالا آمدن سرویس‌ها، اگر خواستید دیتابیس را خالی کنید:

```bash
docker compose exec app npm run seed
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

خالی کردن داده‌ها بدون ساخت mock data:

```bash
npm run seed
```

## یادداشت استقرار داخلی

- `SESSION_SECRET` را در production حتما عوض کنید.
- اگر از `APP_SHARED_PASSWORD_HASH` استفاده می‌کنید، `APP_SHARED_PASSWORD` را حذف کنید.
- دیتابیس PostgreSQL باید قبل از اجرای app در دسترس باشد.
- حذف خرج به صورت نرم انجام می‌شود و status به `CANCELLED` تغییر می‌کند.
