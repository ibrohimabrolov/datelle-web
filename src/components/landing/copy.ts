import { BOT_HANDLE } from "./data";

/* Landing copy per language. UZ is 1:1 from Figma "Landing · Desktop" (299:2859); RU is its adaptation for
   /ru. Section anchors (#imkoniyatlar …) stay the same in both — one set of ids, one CSS.
   Multi-line texts are string[] — each item is a line (rendered with <br/>). */

export type Lang = "uz" | "ru";

const UZ_BASE_INCLUDES = [
  "3 tagacha foydalanuvchi",
  "Kalendar, buyurtma va pul",
  "Egasi uchun Dashboard",
  "Har kuni 20:00 da bot eslatmasi",
  "Eski buyurtmalarni kiritib beramiz",
];

const uz = {
  lang: "uz" as Lang,
  home: "/",
  switchTo: { href: "/ru", label: "RU", hrefLang: "ru", aria: "Русская версия" },
  nav: [
    { href: "#imkoniyatlar", label: "Imkoniyatlar" },
    { href: "#qanday-ishlaydi", label: "Qanday ishlaydi" },
    { href: "#savollar", label: "Savollar" },
  ],
  /* Landing/Menu (mobile + tablet): pricing is a menu item there — no room for it in the bar */
  menu: [
    { href: "#imkoniyatlar", label: "Imkoniyatlar" },
    { href: "#qanday-ishlaydi", label: "Qanday ishlaydi" },
    { href: "#narxlar", label: "Narxlar" },
    { href: "#savollar", label: "Savollar" },
  ],
  a11y: {
    navMain: "Asosiy",
    toHome: " — bosh sahifa",
    toTop: " — tepaga",
    quickBar: "Tezkor menyu",
    sections: "Boʻlimlar",
    sectionsMenu: "Boʻlimlar (menyu)",
    menu: "Menyu",
    menuOpen: "Menyuni ochish",
    menuClose: "Menyuni yopish",
    theme: "Mavzuni almashtirish (kunduzgi / tungi)",
    stats: "Raqamlarda",
    tourTabs: "Ilova ekranlari",
    faqTabs: "Savollar mavzusi",
    footerNav: "Pastki menyu",
    wall: "Birinchi 10 ta studiya uchun boʻsh joylar",
  },
  cta: {
    login: "Kirish",
    start: "Boshlash",
    startFree: "1 oy bepul boshlash",
    telegram: "Telegram'da boshlash",
  },
  hero: {
    eyebrow: "Dekor studiyalari va floristlar uchun",
    eyebrowShort: "Dekor va floristlar uchun",
    h1: ["Sanalar, buyurtmalar", "va pul — bir joyda."],
    lead: "Kalendar, avans va qoldiq, jamoa.",
    leadMore: "Telefonda — Telegram ichida, kompyuterda — brauzerda.",
    offer: "1 oy bepul",
    offerNote: "Karta va shartnomasiz",
  },
  stats: [
    { n: "1", unit: " daqiqa", label: "Studiyani ochish" },
    { n: "0", unit: " soʻm", label: "Birinchi oy" },
    { n: "20", unit: ":00", label: "Har kuni botda eslatma" },
    { n: "2", unit: " qurilma", label: "Telefon va kompyuter" },
  ],
  compare: {
    eyebrow: "Oldin va endi",
    title: "Daftardan — bitta ekranga",
    text: ["Koʻp studiyalar hozir shunday ishlaydi.", "Floreal bilan esa shunday."],
    before: {
      badge: "Hozir",
      title: "Daftar, Excel va 3 ta chat",
      items: ["Avans qayerga yozilgani esdan chiqadi", "Bir sanaga ikki buyurtma tushib qoladi", "Oy oxirida tushum qoʻlda hisoblanadi"],
    },
    after: {
      badge: "Floreal bilan",
      title: "Bitta kalendar, aniq raqamlar",
      items: ["Har buyurtmada avans va qoldiq koʻrinadi", "Band kun ochiq qolmaydi", "Oylik tushum oʻzi hisoblanadi"],
    },
  },
  product: { eyebrow: "Mahsulot", title: "Ichkaridan koʻring" },
  tour: [
    { id: "bosh", label: "Bosh sahifa", alt: "Floreal bosh sahifasi: kompyuterda tushum, qoldiq va keyingi 7 kun, yonida telefondagi kalendar", caption: "Bosh sahifa: bu oy tushum, umumiy qoldiq va keyingi 7 kun — bir qarashda." },
    { id: "kalendar", label: "Kalendar", alt: "Oylik kalendar: boʻsh, 1 joy va band kunlar; telefonda tanlangan kunning buyurtmalari", caption: "Kalendar: qaysi kun boʻsh, qaysi biri band — bir qarashda. Kunni bir bosishda yopasiz." },
    { id: "buyurtmalar", label: "Buyurtmalar", alt: "Buyurtmalar roʻyxati va buyurtma paneli: mijoz, sana, avans va qoldiq", caption: "Buyurtma: mijoz, sana, avans va qoldiq — bitta panelda. Toʻlovni bir bosishda qoʻshasiz." },
    { id: "telefonda", label: "Telefonda", alt: "Telegram ichida: buyurtmalar, bosh sahifa va botning kechki eslatmasi", caption: "Telefonda: hammasi Telegram ichida. Har kuni 20:00 da bot ertangi tadbirlarni eslatadi." },
  ],
  features: {
    eyebrow: "Imkoniyatlar",
    title: "Daftar va Excel oʻrniga",
    text: "Sana, pul va jamoa — bitta ilovada. Studiya egasi va menejerlari uchun.",
    items: [
      { img: "kalendar", badge: "Kalendar", icon: "kalendar", title: "Qaysi kun boʻsh — bir qarashda", text: "Boʻsh, 1 joy yoki band. Kunni bir bosishda yopasiz." },
      { img: "pul", badge: "Pul", icon: "pul", title: "Kim qancha qarz — unutilmaydi", text: "Avans, qoldiq, kechikkanlar va oylik tushum." },
      { img: "jamoa", badge: "Jamoa", icon: "jamoa", title: "Menejer ishlaydi, hisobot sizda", text: "Taklif linki bilan qoʻshasiz. Pul hisobotini faqat egasi koʻradi." },
      { img: "bot", badge: "Telegram bot", icon: "bot", title: "Har kuni 20:00 da — ertangi tadbirlar", text: "Kim, qayerda, qancha qoldiq — ilovani ochmasdan." },
    ],
  },
  steps: {
    eyebrow: "Qanday ishlaydi",
    title: "3 qadam, 5 daqiqa",
    items: [
      { title: `${BOT_HANDLE} ni oching`, text: ["Telegram'da Start bosing.", "Roʻyxatdan oʻtish shart emas."] },
      { title: "Studiyani yarating", text: ["Nomi, yoʻnalishi va kunlik", "sigʻimi — bir daqiqa."] },
      { title: "Birinchi buyurtma", text: ["Sana, mijoz, summa va avans — kalendarda darhol koʻrinadi."] },
    ],
  },
  pricing: {
    eyebrow: "Narxlar",
    title: "Studiyangizga mos tarif",
    text: "Birinchi oy — bepul, hamma imkoniyat bilan. Keyin toʻlov usulini oʻzingiz tanlaysiz.",
    includes: "Nima kiradi",
    trialCta: "Bepul boshlash",
    plans: {
      monthly: { name: "OYLIK", desc: "Oyma-oy, istalgan payt toʻxtatasiz.", price: "299 000", unit: "soʻm / oy", note: ["Ishga tushirish", "+500 000 soʻm"], includes: UZ_BASE_INCLUDES },
      trial: {
        name: "BIRINCHI OY", chip: "BEPUL", desc: "Hamma imkoniyat ochiq — toʻlovsiz, majburiyatsiz.", price: "0 soʻm", unit: "30 kun", note: ["Keyin", "oylik yoki yillik"],
        includes: ["Hamma imkoniyatlar, cheklovsiz", "3 tagacha foydalanuvchi", "Karta va shartnoma kerak emas", "Oy oxirida oʻzingiz tanlaysiz"],
      },
      yearly: { name: "YILLIK", desc: "Bir yilga oldindan — 2 oy tejaysiz.", price: "2 990 000", unit: "soʻm / yil", note: ["Oyiga taxminan", "249 000 soʻm"], includes: UZ_BASE_INCLUDES },
    },
  },
  partners: {
    eyebrow: "Hamkorlar",
    title: "Birinchi 10 ta studiya",
    text: "Floreal bilan ishlagan birinchi studiyalar logotipi shu yerda doimiy turadi. Har yangi studiya bilan devor toʻladi.",
  },
  questions: {
    eyebrow: "Savollar",
    title: "Koʻp soʻraladi",
    text: ["Qanday ishlashi, narxi va maʼlumotlaringiz", "haqida qisqa javoblar."],
  },
  faq: [
    {
      id: "mahsulot",
      label: "Mahsulot",
      items: [
        { q: "Mijozlarim buni koʻradimi?", a: "Yoʻq. Floreal — faqat siz va jamoangiz uchun. Mijozlar hech narsa koʻrmaydi." },
        { q: "Maʼlumotlarim kimda saqlanadi?", a: "Himoyalangan serverda, shifrlangan holda. Ularni faqat siz va jamoangiz koʻradi — biz hech kimga bermaymiz." },
        { q: "Telegram'siz ishlatsa boʻladimi?", a: "Kompyuterda brauzer orqali ishlaydi, kirish esa Telegram bilan tasdiqlanadi. Parol va SMS kerak emas." },
        { q: "Jamoamni qoʻsha olamanmi?", a: "Ha. Menejerga taklif linkini yuborasiz: u buyurtma va toʻlov kiritadi, tushum hisobotini faqat siz koʻrasiz." },
      ],
    },
    {
      id: "narx",
      label: "Narx va toʻlov",
      items: [
        { q: "Ishga tushirish nima uchun pullik?", a: "Bir martalik 500 000 soʻm: eski buyurtmalaringizni kiritib beramiz va jamoani 1 soat oʻrgatamiz." },
        { q: "Istalgan payt toʻxtatsam boʻladimi?", a: "Ha. Oylik tarifda shartnoma yoʻq: keyingi oy toʻlamasangiz, obuna toʻxtaydi." },
        { q: "3 tadan koʻp xodim boʻlsa-chi?", a: "Har bir qoʻshimcha foydalanuvchi — oyiga 49 000 soʻm." },
        { q: "Bepul oydan keyin nima boʻladi?", a: "Oy oxirida oylik yoki yillik tarifni tanlaysiz. Tanlamasangiz, obuna toʻxtaydi — hech narsa avtomatik yechilmaydi." },
      ],
    },
  ],
  footer: {
    text: ["Dekor studiyalari va floristlar uchun.", "Sanalar, buyurtmalar va pul — bir joyda."],
    product: "Mahsulot",
    partnersLink: "Hamkorlar",
    start: "Boshlash",
    desktopLogin: "Kompyuterda kirish",
    docs: "Hujjatlar",
    privacy: "Maxfiylik",
  },
  seo: {
    pageName: "Floreal — dekor studiyalari va floristlar uchun CRM",
    appDescription:
      "Dekor studiyalari va floristlar uchun CRM: bron kalendari, buyurtmalar, avans va qoldiq hisobi, jamoa. Telefonda — Telegram ichida, kompyuterda — brauzerda.",
    features: ["Bron kalendari", "Buyurtmalar", "Avans va qoldiq hisobi", "Jamoa va rollar", "Tushum hisoboti"],
    offers: { monthly: "Oylik", yearly: "Yillik", trial: "Birinchi oy — bepul" },
    city: "Toshkent",
  },
};

export type Copy = typeof uz;

const RU_BASE_INCLUDES = [
  "До 3 пользователей",
  "Календарь, заказы и деньги",
  "Дашборд для владельца",
  "Напоминание бота каждый день в 20:00",
  "Перенесём ваши старые заказы",
];

const ru: Copy = {
  lang: "ru",
  home: "/ru",
  switchTo: { href: "/", label: "UZ", hrefLang: "uz", aria: "Oʻzbekcha versiya" },
  nav: [
    { href: "#imkoniyatlar", label: "Возможности" },
    { href: "#qanday-ishlaydi", label: "Как это работает" },
    { href: "#savollar", label: "Вопросы" },
  ],
  menu: [
    { href: "#imkoniyatlar", label: "Возможности" },
    { href: "#qanday-ishlaydi", label: "Как это работает" },
    { href: "#narxlar", label: "Цены" },
    { href: "#savollar", label: "Вопросы" },
  ],
  a11y: {
    navMain: "Основное меню",
    toHome: " — на главную",
    toTop: " — наверх",
    quickBar: "Быстрое меню",
    sections: "Разделы",
    sectionsMenu: "Разделы (меню)",
    menu: "Меню",
    menuOpen: "Открыть меню",
    menuClose: "Закрыть меню",
    theme: "Сменить тему (светлая / тёмная)",
    stats: "В цифрах",
    tourTabs: "Экраны приложения",
    faqTabs: "Темы вопросов",
    footerNav: "Нижнее меню",
    wall: "Свободные места для первых 10 студий",
  },
  cta: {
    login: "Войти",
    start: "Начать",
    startFree: "Начать бесплатно",
    telegram: "Начать в Telegram",
  },
  hero: {
    eyebrow: "Для декор-студий и флористов",
    eyebrowShort: "Для декора и флористов",
    h1: ["Даты, заказы и деньги\u00a0—", "в\u00a0одном месте."],
    lead: "Календарь, аванс и остаток, команда.",
    leadMore: "В телефоне — внутри Telegram, на компьютере — в браузере.",
    offer: "Месяц бесплатно",
    offerNote: "Без карты и договора",
  },
  stats: [
    { n: "1", unit: " минута", label: "Чтобы открыть студию" },
    { n: "0", unit: " сум", label: "Первый месяц" },
    { n: "20", unit: ":00", label: "Напоминание в боте каждый день" },
    { n: "2", unit: " экрана", label: "Телефон и компьютер" },
  ],
  compare: {
    eyebrow: "До и после",
    title: "Из тетради — на один экран",
    text: ["Так сейчас работают многие студии.", "А так — с Floreal."],
    before: {
      badge: "Сейчас",
      title: "Тетрадь, Excel и 3 чата",
      items: ["Забывается, куда записан аванс", "На одну дату попадают два заказа", "Выручку за месяц считают вручную"],
    },
    after: {
      badge: "С Floreal",
      title: "Один календарь, точные цифры",
      items: ["В каждом заказе видны аванс и остаток", "Занятый день не останется открытым", "Выручка за месяц считается сама"],
    },
  },
  product: { eyebrow: "Продукт", title: "Посмотрите изнутри" },
  tour: [
    { id: "bosh", label: "Главная", alt: "Главная Floreal: на компьютере выручка, остаток и ближайшие 7 дней, рядом календарь в телефоне", caption: "Главная: выручка за месяц, общий остаток и ближайшие 7 дней — с одного взгляда." },
    { id: "kalendar", label: "Календарь", alt: "Календарь на месяц: свободные дни, «1 место» и занятые; в телефоне — заказы выбранного дня", caption: "Календарь: какой день свободен, а какой занят — видно сразу. День закрывается одним нажатием." },
    { id: "buyurtmalar", label: "Заказы", alt: "Список заказов и панель заказа: клиент, дата, аванс и остаток", caption: "Заказ: клиент, дата, аванс и остаток — в одной панели. Оплата добавляется одним нажатием." },
    { id: "telefonda", label: "В телефоне", alt: "Внутри Telegram: заказы, главная и вечернее напоминание бота", caption: "В телефоне: всё внутри Telegram. Каждый день в 20:00 бот напоминает о завтрашних мероприятиях." },
  ],
  features: {
    eyebrow: "Возможности",
    title: "Вместо тетради и Excel",
    text: "Даты, деньги и команда — в одном приложении. Для владельца студии и менеджеров.",
    items: [
      { img: "kalendar", badge: "Календарь", icon: "kalendar", title: "Свободные дни — с одного взгляда", text: "Свободен, 1 место или занят. День закрывается одним нажатием." },
      { img: "pul", badge: "Деньги", icon: "pul", title: "Кто сколько должен — не забудется", text: "Аванс, остаток, просрочки и выручка за месяц." },
      { img: "jamoa", badge: "Команда", icon: "jamoa", title: "Менеджер работает, отчёт у вас", text: "Добавляете по ссылке-приглашению. Денежный отчёт видит только владелец." },
      { img: "bot", badge: "Telegram-бот", icon: "bot", title: "Каждый день в 20:00 — завтрашние мероприятия", text: "Кто, где, сколько осталось — не открывая приложение." },
    ],
  },
  steps: {
    eyebrow: "Как это работает",
    title: "3 шага, 5 минут",
    items: [
      { title: `Откройте ${BOT_HANDLE}`, text: ["Нажмите Start в Telegram.", "Регистрация не нужна."] },
      { title: "Создайте студию", text: ["Название, направление и вместимость", "в день — одна минута."] },
      { title: "Первый заказ", text: ["Дата, клиент, сумма и аванс — сразу видны в календаре."] },
    ],
  },
  pricing: {
    eyebrow: "Цены",
    title: "Тариф под вашу студию",
    text: "Первый месяц — бесплатно, со всеми возможностями. Дальше способ оплаты выбираете сами.",
    includes: "Что входит",
    trialCta: "Начать бесплатно",
    plans: {
      monthly: { name: "ПОМЕСЯЧНО", desc: "Платите помесячно, остановить можно в любой момент.", price: "299 000", unit: "сум / мес", note: ["Подключение", "+500 000 сум"], includes: RU_BASE_INCLUDES },
      trial: {
        name: "ПЕРВЫЙ МЕСЯЦ", chip: "БЕСПЛАТНО", desc: "Всё открыто — без оплаты и обязательств.", price: "0 сум", unit: "30 дней", note: ["Затем", "помесячно или на год"],
        includes: ["Все возможности открыты", "До 3 пользователей", "Карта и договор не нужны", "В конце месяца решаете сами"],
      },
      yearly: { name: "НА ГОД", desc: "Оплата за год вперёд — 2 месяца в подарок.", price: "2 990 000", unit: "сум / год", note: ["В месяц примерно", "249 000 сум"], includes: RU_BASE_INCLUDES },
    },
  },
  partners: {
    eyebrow: "Студии",
    title: "Первые 10 студий",
    text: "Логотипы первых студий, работающих с Floreal, будут здесь всегда. С каждой новой студией стена заполняется.",
  },
  questions: {
    eyebrow: "Вопросы",
    title: "Частые вопросы",
    text: ["Коротко о том, как это работает,", "сколько стоит и что с вашими данными."],
  },
  faq: [
    {
      id: "mahsulot",
      label: "Продукт",
      items: [
        { q: "Мои клиенты это увидят?", a: "Нет. Floreal — только для вас и вашей команды. Клиенты ничего не видят." },
        { q: "Где хранятся мои данные?", a: "На защищённом сервере, в зашифрованном виде. Их видите только вы и ваша команда — мы никому их не передаём." },
        { q: "Можно пользоваться без Telegram?", a: "На компьютере — в браузере, а вход подтверждается через Telegram. Пароль и SMS не нужны." },
        { q: "Можно добавить команду?", a: "Да. Отправляете менеджеру ссылку-приглашение: он вносит заказы и оплаты, а отчёт по выручке видите только вы." },
        { q: "На каком языке интерфейс?", a: "Пока на узбекском (латиница). Русский интерфейс — в планах." },
      ],
    },
    {
      id: "narx",
      label: "Цены и оплата",
      items: [
        { q: "Почему подключение платное?", a: "Разово 500 000 сум: перенесём ваши старые заказы и за 1 час обучим команду." },
        { q: "Можно остановить в любой момент?", a: "Да. На помесячном тарифе договора нет: не оплатили следующий месяц — подписка останавливается." },
        { q: "А если сотрудников больше трёх?", a: "Каждый дополнительный пользователь — 49 000 сум в месяц." },
        { q: "Что будет после бесплатного месяца?", a: "В конце месяца выбираете помесячный или годовой тариф. Не выбрали — подписка останавливается, ничего не списывается автоматически." },
      ],
    },
  ],
  footer: {
    text: ["Для декор-студий и флористов.", "Даты, заказы и деньги — в одном месте."],
    product: "Продукт",
    partnersLink: "Студии",
    start: "Начать",
    desktopLogin: "Вход с компьютера",
    docs: "Документы",
    privacy: "Конфиденциальность",
  },
  seo: {
    pageName: "Floreal — CRM для декор-студий и флористов",
    appDescription:
      "CRM для декор-студий и флористов: календарь броней, заказы, учёт аванса и остатка, команда. В телефоне — внутри Telegram, на компьютере — в браузере.",
    features: ["Календарь броней", "Заказы", "Учёт аванса и остатка", "Команда и роли", "Отчёт по выручке"],
    offers: { monthly: "Помесячно", yearly: "На год", trial: "Первый месяц — бесплатно" },
    city: "Ташкент",
  },
};

export const COPY: Record<Lang, Copy> = { uz, ru };
