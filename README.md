# وب‌سایت Asperlos

سایت سه‌زبانه (انگلیسی، فارسی، روسی) شرکت آسپرلوس. سایت با Astro به‌صورت استاتیک ساخته می‌شود و فرم استعلام آن با PHP روی هاست cPanel کار می‌کند.

مستندات:
- [ADR-0001: تصمیم‌های معماری](docs/adr/0001-website-architecture.md)
- [ساختار سایت](docs/site-structure.md)
- [راهنمای برند و واژه‌نامه](docs/brand-guide.md): پیش از نوشتن یا ترجمه هر متنی خوانده شود.

## اجرا روی سیستم

پیش‌نیاز: Node.js نسخه ۲۲.۱۲ یا بالاتر.

```bash
npm install
npm run dev       # سرور توسعه روی http://localhost:4321
npm run build     # خروجی در dist/
npm run preview   # نمایش خروجی build
npm run check:placeholders   # فهرست جاهای «[تکمیل شود]» که هنوز در سایت مانده‌اند
```

فرم استعلام روی سیستم محلی کار نمی‌کند، چون به PHP و MySQL هاست نیاز دارد.

## تغییر محتوا

| چه چیزی | کجا |
|---|---|
| محصولات (هر محصول، سه فایل برای سه زبان) | `src/content/products/{en,fa,ru}/<slug>.md` |
| صفحه کشورهای مبدأ | `src/content/origins/{en,fa,ru}/<country>.md` |
| متن‌های ثابت سایت (دکمه‌ها، عنوان‌ها، فرم) | `src/i18n/{en,fa,ru}.json` |
| تلفن، واتساپ، تلگرام، بله، ایتا، ایمیل، لینکدین | `src/data/contact.json` |
| دامنه سایت | `site` در `astro.config.mjs` |

- محصول جدید باید در هر سه زبان، با همان نام فایل، وجود داشته باشد. وگرنه build با خطا متوقف می‌شود.
- کلیدهای سه فایل `i18n` هم باید یکسان باشند.
- جاهای خالی به شکل `[TBD: …]`، `[تکمیل شود: …]` یا `[уточняется: …]` نوشته می‌شوند. تا وقتی یکی از آن‌ها در سایت مانده باشد، Deploy خودکار متوقف می‌شود.

## راه‌اندازی روی هاست (یک بار)

1. **PHP:** در cPanel نسخه PHP را روی ۸.۱ یا بالاتر بگذارید (افزونه‌های `pdo_mysql`، `mbstring` و `curl` فعال باشند).
2. **دیتابیس:** در بخش MySQL Databases یک دیتابیس و کاربر بسازید. بعد در phpMyAdmin محتوای `server/schema.sql` را اجرا کنید.
3. **تنظیمات:** `server/config.sample.php` را پر کنید و با نام `asperlos-config.php` در **پوشه خانه هاست**، یعنی یک سطح بالاتر از `public_html`، قرار دهید. این فایل نباید در git یا داخل `public_html` باشد.
4. **ایمیل:** نشانی `from_email` روی همان دامنه سایت باشد. در بخش Email Deliverability، رکوردهای SPF و DKIM را فعال کنید.
5. **SSL:** در بخش SSL/TLS Status، گواهی AutoSSL را برای دامنه فعال کنید.

## انتشار خودکار (GitHub Actions)

با هر push به شاخه `main`، سایت build می‌شود، جاهای خالی بررسی می‌شوند و خروجی با FTPS روی هاست آپلود می‌شود.

این Secretها را در GitHub، در مسیر Settings ← Secrets and variables ← Actions، تعریف کنید:

| Secret | مقدار |
|---|---|
| `FTP_SERVER` | آدرس سرور FTP هاست |
| `FTP_USERNAME` | نام کاربری FTP |
| `FTP_PASSWORD` | رمز FTP |
| `FTP_SERVER_DIR` | (اختیاری) مسیر مقصد؛ پیش‌فرض `public_html/` |

## نسخه‌سازی (Release)

```bash
npm run release
```

هر بار اجرای این دستور:
1. یک شماره build جدید می‌گیرد. شماره در `release.json` نگهداری می‌شود. این فایل را commit کنید تا شماره‌ها تکراری نشوند.
2. سایت را build می‌کند.
3. فایل `version.json` را در سایت می‌گذارد. با باز کردن `https://<دامنه>/version.json` معلوم می‌شود کدام نسخه روی هاست است.
4. یک فایل ZIP آماده آپلود در پوشه `releases/` می‌سازد، مثلاً `releases/asperlos-v0.1.0-build.001.zip`.
5. یک سطر به `releases/RELEASES.md` اضافه می‌کند: شماره، تاریخ، commit، تعداد جاهای خالی و حجم.

نسخه اصلی (`0.1.0`) در `package.json` است و برای تغییرات بزرگ دستی بالا برده می‌شود. پوشه `releases/` در git نیست.

**انتشار دستی:** در cPanel، در File Manager، فایل ZIP را در `public_html` آپلود و همان‌جا Extract کنید. فایل مخفی `.htaccess` داخل ZIP هست.
