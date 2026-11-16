# ساختار وب‌سایت Asperlos

> مکمل [ADR-0001](adr/0001-website-architecture.md).

## ۱. نقشه سایت (Sitemap)

| زبان | پیشوند مسیر | جهت | فونت |
|---|---|---|---|
| **انگلیسی (پیش‌فرض)** | `/` | LTR | IBM Plex Sans |
| فارسی | `/fa/` | RTL | IBM Plex Sans Arabic |
| روسی | `/ru/` | LTR | IBM Plex Sans |

مسیرهای زیر برای انگلیسی‌اند. نسخه فارسی و روسی همین مسیرها را با پیشوند زبان دارند (مثلاً `/fa/products/pulses/red-lentils/`).
آدرس‌ها (slug) در هر سه زبان انگلیسی می‌مانند تا کوتاه و قابل اشتراک باشند.

```
/                                   خانه
├── /products/                      همه محصولات
│   ├── /products/pulses/            دسته: حبوبات
│   │   ├── /products/pulses/red-lentils/       عدس قرمز (روسیه)
│   │   ├── /products/pulses/chickpeas/         نخود
│   │   └── ...
│   └── /products/dried-fruit/      دسته: خشکبار
│       ├── /products/dried-fruit/seeded-raisins/  مویز (ازبکستان)
│       └── ...
├── /origins/                       مبادی واردات
│   ├── /origins/russia/            روسیه
│   └── /origins/uzbekistan/        ازبکستان
├── /how-we-work/                   فرایند همکاری و لجستیک
├── /about/                         درباره آسپرلوس و حوزه فعالیت
├── /faq/                           پرسش‌های رایج (با FAQPage schema؛ لینک در فوتر)
├── /inquiry/                       فرم استعلام ★ (هدف اصلی سایت)
├── /contact/                       تماس با ما
├── /blog/                          مقالات (فاز ۲)
└── /404                            صفحه خطا

فایل‌های ماشینی: /robots.txt، /sitemap-index.xml، /llms.txt (خلاصه شرکت برای هوش مصنوعی)، /version.json و فایل کلید IndexNow (/<کلید>.txt).
```

**انتخاب زبان:**
- سوییچ زبان در هدر همه صفحات هست و کاربر را به **همان صفحه** در زبان دیگر می‌برد.
- اگر زبان مرورگر فارسی یا روسی باشد، یک نوار پیشنهاد زبان نمایش داده می‌شود. ریدایرکت خودکار نداریم.
- لینک‌هایی که در پیام‌رسان‌های ایرانی پخش می‌شوند، مستقیم به `/fa/` می‌روند.

## ۲. محتوای هر صفحه

### خانه
- Hero: یک جمله ارزش پیشنهادی و دکمه **Request a Quote**
- محصولات شاخص (۴ تا ۶ کارت)
- نقشه مسیرهای نمادین از روسیه و آسیای مرکزی به تهران
- چرا ما: واردات مستقیم، کنترل کیفیت، تأمین پایدار و تحویل در انبار
- اعداد کلیدی: سال فعالیت، تناژ سالانه، تعداد مشتریان (در صورت تمایل)
- فراخوان نهایی: استعلام و تماس

### صفحه محصول

| بخش | نمونه |
|---|---|
| نام و تصاویر | عدس قرمز روسی، ۳ تا ۵ عکس |
| کشور مبدأ | روسیه، منطقه … |
| گرید و سایز | درجه ۱، سایز ۴ تا ۵ میلی‌متر |
| مشخصات فنی | رطوبت، ناخالصی، دانه شکسته (جدول) |
| بسته‌بندی | کیسه ۲۵ یا ۵۰ کیلویی، جامبوبگ |
| حداقل سفارش (MOQ) | مثلاً ۱ کامیون یا ۲۵ تن |
| موجودی یا فصل عرضه | موجود / فصل برداشت: مرداد تا مهر |
| گواهی‌ها | گواهی بهداشت گیاهی، گواهی مبدأ |
| فایل مشخصات | دانلود PDF |
| **دکمه‌ها (برجسته)** | **استعلام این محصول** (فرم با نام محصول پر می‌شود)، **پیام در واتساپ** و یکی از تلگرام یا بله. متن آماده برای واتساپ و تلگرام است. |

### فرم استعلام
فرم نام و دست‌کم یکی از دو راه تماس (ایمیل یا شمارهٔ واتساپ) را می‌خواهد. انتخاب محصول و توضیحات اختیاری‌اند.
هاست درخواست را به `info@asperlos.ir` ایمیل می‌کند و پس از پذیرش آن برای ارسال، صفحهٔ تأیید باز می‌شود. ذخیره در MySQL و اعلان در پیام‌رسان اختیاری‌اند.

### تماس و کانال‌های ارتباطی

ترتیب کانال‌ها در هر زبان (عدد = جایگاه نمایش):

| کانال | نوع لینک | انگلیسی | روسی | فارسی |
|---|---|---|---|---|
| ایمیل شرکت | `mailto:info@asperlos.ir` | ۱ | ۱ | ۵ |
| واتساپ | `https://wa.me/98…` | ۲ | ۲ | ۲ |
| تلگرام | `https://t.me/+98…` | ۳ | ۳ | ۳ |
| تلفن | `tel:+98…` | ۴ | ۴ | ۱ |
| بله | `https://web.bale.ai/+98…` | ۵ | ۵ | ۴ |
| لینکدین | `https://www.linkedin.com/company/asperlos/` | ۶ | ۶ | ۶ |

کانال‌ها در این جاها نمایش داده می‌شوند:
- صفحه تماس
- فوتر همه صفحات
- کنار فرم استعلام
- نوار پایین صفحه در موبایل، با دکمه واتساپ

صفحه تماس «تهران، ایران» را با نقشه تعبیه‌شده گوگل و لینک باز کردن شهر در Google Maps نشان می‌دهد.

## ۳. مدل داده

### محصول: `src/content/products/{en,fa,ru}/red-lentils.md`
```yaml
title: Russian Red Lentils
category: pulses           # pulses | dried-fruit | ... (slugها طبق واژه‌نامه brand-guide)
origin: russia
featured: true
images: [./img/1.jpg, ./img/2.jpg]
specs:
  - { label: Moisture, value: "max 14%" }          # اعداد نمونه‌اند؛ فقط عدد قرارداد واقعی منتشر شود
  - { label: Foreign matter, value: "max 0.5%" }
packaging: [25 kg PP bag, 50 kg PP bag, Big bag (FIBC)]
moq: 25 t
availability: in-stock     # in-stock | seasonal | on-request
certificates: [phytosanitary, origin]
specSheet: ./red-lentils.pdf
---
Free-form product description (Markdown)...
```
- نام فایل (`red-lentils`) کلید مشترک بین سه زبان است.
- اگر ترجمه یک محصول در یکی از زبان‌ها نباشد، build با خطا متوقف می‌شود.

### اطلاعات تماس: `src/data/contact.json`
شماره بین‌المللی مشترک برای تلفن و پیام‌رسان‌ها، ایمیل، لینک صفحه شرکت در لینکدین، موقعیت شهر و ترتیب نمایش کانال‌ها در این فایل نگهداری می‌شوند. هدر، فوتر، صفحه تماس و داده‌های ساختاریافته از همین فایل می‌خوانند.

### واژه‌نامه و متن‌های استاندارد: [`docs/brand-guide.md`](brand-guide.md)
نام محصولات و slugها، اصطلاحات فنی، بسته‌بندی، Incoterms، گواهی‌ها، متن دکمه‌ها و پیام‌های فرم در سه زبان در این سند ثابت شده‌اند. فایل‌های `src/i18n/*.json` از آن پیروی می‌کنند.

## ۴. روند به‌روزرسانی محتوا (ماهی ۱ تا ۲ بار)

1. متن جدید یا تغییرات را به یک زبان (مثلاً فارسی) به Claude می‌دهید.
2. Claude هر سه فایل (en/fa/ru) را به‌روز می‌کند.
3. تغییرات را بررسی و push می‌کنید.
4. GitHub Actions سایت را build می‌کند و روی cPanel قرار می‌دهد. این کار حدود ۲ دقیقه طول می‌کشد.

## ۵. ساختار پوشه‌های پروژه

```
asperlos-website/
├── docs/
│   ├── adr/                 تصمیم‌های معماری
│   ├── brand-guide.md       راهنمای برند، لحن و واژه‌نامه سه‌زبانه
│   ├── design/              نمونه طراحی (mockup) و فایل اصلی لوگو
│   └── site-structure.md
├── public/                  فایل‌هایی که بدون تغییر در خروجی کپی می‌شوند
│   ├── api/inquiry.php      پردازش فرم استعلام (PHP روی cPanel)
│   ├── favicon-*.png, apple-touch-icon.png, og-image.png
│   └── .htaccess            HTTPS، فشرده‌سازی، کش، هدرهای امنیتی، صفحه 404
├── server/                  فایل‌های راه‌اندازی هاست (آپلود نمی‌شوند)
│   ├── schema.sql           جدول inquiries
│   └── config.sample.php    نمونه تنظیمات؛ نسخه واقعی بیرون از public_html و خارج از git
├── scripts/
│   └── check-placeholders.mjs   جلوی انتشار «[تکمیل شود]» را می‌گیرد
├── src/
│   ├── assets/              logo-mark.png و logo-mark-white.png (لوگوی رنگی و سفید)، seeds/ (تصویر دانه‌ها؛ docs/design/art)
│   ├── content/
│   │   ├── products/{en,fa,ru}/
│   │   └── origins/{en,fa,ru}/
│   ├── content.config.ts    مدل داده محصولات و مبادی
│   ├── data/contact.json    همه اطلاعات تماس
│   ├── i18n/                en.json, fa.json, ru.json + index.ts (توابع ترجمه و مسیر)
│   ├── lib/                 content.ts (محصولات، بررسی کامل بودن ترجمه)، contact.ts (لینک کانال‌ها)، seeds.ts (تصویر دانه‌ها)
│   ├── components/          Header (با منوی تمام‌صفحه), LangSuggestBar, Footer, QuickBar, HomeHero, RouteMap, Seed, ProductTable,
│   │                        StatusMark, Steps, PageHeader, InquiryForm, InquirySection, ContactChannels
│   ├── layouts/             BaseLayout (dir، فونت‌ها، متا، hreflang، Schema)
│   ├── pages/
│   │   ├── [...lang]/       همه صفحات؛ en در ریشه، fa/ و ru/
│   │   ├── api/products.json.ts   لیست محصولات برای inquiry.php
│   │   ├── robots.txt.ts
│   │   └── 404.astro
│   └── styles/global.css    توکن‌های رنگ و تایپوگرافی
├── .github/workflows/
│   └── deploy.yml           build، بررسی جاهای خالی و FTPS deploy
└── astro.config.mjs         دامنه سایت (site) فقط اینجاست
```

## ۶. اهداف عملکرد و کیفیت

| معیار | هدف |
|---|---|
| Lighthouse (Performance / SEO / Accessibility) | ۹۵ یا بیشتر |
| LCP روی موبایل 4G ایران (سرور کانادا) | کمتر از ۲.۵ ثانیه |
| وزن صفحه خانه | کمتر از ۵۰۰KB |
| تعداد درخواست در بار اول | کمتر از ۱۵ |
| JavaScript سمت کاربر | نزدیک صفر (نوار زبان و ارسال فرم) |
| درخواست به دامنه خارجی | نقشه تعبیه‌شده گوگل در صفحه تماس |
| سئو | Schema نوع `Organization` و `Product`، sitemap.xml، hreflang (en/fa/ru + x-default)، Open Graph |
