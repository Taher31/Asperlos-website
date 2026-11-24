import type { Lang } from '../i18n';

export const tradeServiceSlugs = ['sourcing', 'import', 'export'] as const;
export type TradeServiceSlug = (typeof tradeServiceSlugs)[number];

interface ServicePage {
  title: string;
  description: string;
  scopeTitle: string;
  scope: string[];
  inquiry: string[];
}

interface LocalizedServices {
  inquiryTitle: string;
  relatedTitle: string;
  pages: Record<TradeServiceSlug, ServicePage>;
}

export const tradeServices: Record<Lang, LocalizedServices> = {
  en: {
    inquiryTitle: 'What to include in your inquiry',
    relatedTitle: 'Related trading services',
    pages: {
      sourcing: {
        title: 'International sourcing for businesses',
        description: 'Asperlos helps businesses source goods internationally. We review supplier options based on product specifications, quantity and destination.',
        scopeTitle: 'How we review sourcing options',
        scope: [
          'We start with the goods you need. A product name, specification sheet or description of the intended use helps us identify suitable suppliers. We review options against your quantity, packaging and delivery requirements.',
          'Pulses and dried fruit are examples from our catalogue. You can also enquire about other goods. For each order we agree the specification, quantity and delivery terms with you.',
        ],
        inquiry: [
          'Product name, intended use or specification sheet',
          'Required quantity and any packaging requirements',
          'Delivery destination and preferred timing, if known',
        ],
      },
      import: {
        title: 'Import services in Iran',
        description: 'Asperlos coordinates imports to Iran for businesses, including freight, shipment documents and customs clearance as agreed for each order.',
        scopeTitle: 'Planning an import shipment',
        scope: [
          'Tell us what you want to import and whether you already have a supplier. We review the goods, route, destination and shipment documents before you agree the order.',
          'We agree who handles freight, documents, customs clearance and delivery. The responsibilities and delivery terms depend on the goods and each shipment’s route.',
        ],
        inquiry: [
          'Product, specifications and quantity',
          'Country of origin or supplier location, if known',
          'Delivery destination in Iran and preferred delivery date',
        ],
      },
      export: {
        title: 'Export services from Iran',
        description: 'Asperlos helps businesses in Iran arrange export shipments, coordinating transport and shipment documents for the agreed destination.',
        scopeTitle: 'Preparing an export shipment',
        scope: [
          'We review the goods, pickup location and destination with you before we agree the order. The shipping plan depends on the product, packaging, route and buyer’s delivery requirements.',
          'We confirm the required shipment documents and agree who handles transport and delivery. If your buyer has specific labelling, packaging or document requirements, include them in your initial inquiry.',
        ],
        inquiry: [
          'Product, quantity, packaging and location in Iran',
          'Destination country and delivery point, if known',
          'The buyer’s document or delivery requirements',
        ],
      },
    },
  },
  fa: {
    inquiryTitle: 'چه اطلاعاتی در استعلام بنویسید؟',
    relatedTitle: 'دیگر خدمات بازرگانی',
    pages: {
      sourcing: {
        title: 'تأمین کالا از بازارهای بین‌المللی',
        description: 'اسپرلوس به کسب‌وکارها در تأمین کالا از بازارهای بین‌المللی کمک می‌کند و تأمین‌کنندگان را بر اساس مشخصات کالا، مقدار و مقصد بررسی می‌کند.',
        scopeTitle: 'چطور گزینه‌های تأمین را بررسی می‌کنیم؟',
        scope: [
          'نام کالا، برگهٔ مشخصات یا توضیح کاربرد آن به ما کمک می‌کند تأمین‌کنندگان مناسب را شناسایی کنیم. گزینه‌ها را با توجه به مقدار مورد نیاز شما، نوع بسته‌بندی و شرایط تحویل بررسی می‌کنیم.',
          'حبوبات و خشکبار نمونه‌هایی از کاتالوگ ما هستند. برای کالاهای دیگر هم می‌توانید استعلام بفرستید. دربارهٔ مشخصات، مقدار و شرایط تحویل هر سفارش با شما به توافق می‌رسیم.',
        ],
        inquiry: [
          'نام کالا، کاربرد یا برگهٔ مشخصات',
          'مقدار مورد نیاز و شرایط بسته‌بندی',
          'مقصد و زمان مطلوب تحویل، در صورت مشخص بودن',
        ],
      },
      import: {
        title: 'خدمات واردات کالا به ایران',
        description: 'اسپرلوس واردات کالا به ایران را برای کسب‌وکارها هماهنگ می‌کند. حمل، مدارک محموله و ترخیص طبق توافق هر سفارش انجام می‌شود.',
        scopeTitle: 'برنامه‌ریزی برای محمولهٔ وارداتی',
        scope: [
          'نوع کالایی را که می‌خواهید وارد کنید مشخص کنید و بگویید آیا تأمین‌کننده دارید. پیش از نهایی شدن سفارش، کالا، مسیر، مقصد و مدارک محموله را بررسی می‌کنیم.',
          'با شما توافق می‌کنیم که مسئولیت حمل، مدارک، ترخیص و تحویل با چه کسی باشد. تقسیم مسئولیت‌ها و شرایط تحویل به نوع کالا و مسیر هر محموله بستگی دارد.',
        ],
        inquiry: [
          'نام کالا، مشخصات و مقدار مورد نیاز',
          'کشور مبدأ یا محل تأمین‌کننده، در صورت مشخص بودن',
          'مقصد کالا در ایران و زمان مطلوب تحویل',
        ],
      },
      export: {
        title: 'خدمات صادرات کالا از ایران',
        description: 'اسپرلوس به کسب‌وکارهای ایرانی در صادرات کالا کمک می‌کند و حمل و مدارک محموله را تا مقصد توافق‌شده هماهنگ می‌کند.',
        scopeTitle: 'آماده‌سازی محمولهٔ صادراتی',
        scope: [
          'پیش از توافق روی سفارش، نوع کالا، محل بارگیری و مقصد را با شما بررسی می‌کنیم. برنامهٔ حمل به نوع کالا، بسته‌بندی، مسیر و شرایط تحویل مورد نیاز خریدار بستگی دارد.',
          'مدارک لازم برای محموله را مشخص می‌کنیم و دربارهٔ مسئولیت حمل و تحویل به توافق می‌رسیم. اگر خریدار برای برچسب‌گذاری، بسته‌بندی یا مدارک شرایط خاصی دارد، در استعلام اولیه بنویسید.',
        ],
        inquiry: [
          'نام کالا، مقدار، نوع بسته‌بندی و محل بارگیری در ایران',
          'کشور مقصد و محل تحویل، در صورت مشخص بودن',
          'مدارک یا شرایط تحویل مورد نیاز خریدار',
        ],
      },
    },
  },
  ru: {
    inquiryTitle: 'Что указать в запросе',
    relatedTitle: 'Другие торговые услуги',
    pages: {
      sourcing: {
        title: 'Международные закупки для бизнеса',
        description: 'Асперлос помогает компаниям закупать товары на международных рынках. Мы оцениваем поставщиков с учетом характеристик товара, объема и места доставки.',
        scopeTitle: 'Как мы подбираем поставщиков',
        scope: [
          'Название товара, спецификация или описание его назначения помогают найти подходящих поставщиков. Мы рассматриваем варианты с учетом нужного объема, упаковки и условий доставки.',
          'В нашем каталоге представлены, например, бобовые и сухофрукты. Можно отправить запрос и на другие товары. Характеристики, объем и условия поставки согласовываем по каждому заказу.',
        ],
        inquiry: [
          'Название, назначение или спецификация товара',
          'Нужный объем и требования к упаковке',
          'Место и желаемые сроки доставки, если они известны',
        ],
      },
      import: {
        title: 'Импорт товаров в Иран',
        description: 'Асперлос координирует импорт товаров в Иран для бизнеса. Перевозку, документы и таможенное оформление согласовываем по каждому заказу.',
        scopeTitle: 'Планирование импортной поставки',
        scope: [
          'Если вы поставщик и планируете отгрузку в Иран, укажите товар, место отгрузки и требования покупателя, если они известны. Если вы закупаете товар для ввоза, сообщите, есть ли у вас поставщик.',
          'Мы согласовываем, кто отвечает за перевозку, документы, таможенное оформление и передачу товара. Условия поставки и распределение обязанностей зависят от товара и маршрута конкретной партии.',
        ],
        inquiry: [
          'Название, характеристики и объем товара',
          'Страна происхождения или местонахождение поставщика, если оно известно',
          'Место доставки в Иране и желаемые сроки',
        ],
      },
      export: {
        title: 'Экспорт товаров из Ирана',
        description: 'Асперлос помогает компаниям в Иране организовать экспортные поставки, согласовывая перевозку и документы для выбранного пункта назначения.',
        scopeTitle: 'Подготовка экспортной поставки',
        scope: [
          'До согласования заказа мы уточняем вид товара, место погрузки и пункт назначения. План перевозки зависит от товара, упаковки, маршрута и требований покупателя к доставке.',
          'Мы определяем, какие документы потребуются для партии, и согласовываем, кто отвечает за перевозку и передачу товара. Если у покупателя есть особые требования к маркировке, упаковке или документам, укажите их в первом запросе.',
        ],
        inquiry: [
          'Товар, объем, упаковка и место погрузки в Иране',
          'Страна назначения и место доставки, если оно известно',
          'Требования покупателя к документам или доставке',
        ],
      },
    },
  },
};
