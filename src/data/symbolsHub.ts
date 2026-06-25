export type Locale = 'de' | 'en' | 'fr' | 'es' | 'ru';

export interface SymbolEntry {
  slug: string;
  img: string;
  categories: string;
  labels: Record<Locale, { name: string; subtitle: string }>;
}

export interface HubStrings {
  pill: string;
  h1: string;
  desc: string;
  topLabel: string;
  filterLabel: string;
  filterAll: string;
  filterAngst: string;
  filterKontrolle: string;
  filterBeziehung: string;
  filterTransformation: string;
  cardSuffix: string;
  ctaH2: string;
  ctaBtn1: string;
  ctaBtn2: string;
  guideHref: string;
  guideLabel: string;
  footerDesc: string;
  footerSub: string;
  footerBack: string;
}

export const HUB_STRINGS: Record<Locale, HubStrings> = {
  de: {
    pill: 'Traumsymbol-Lexikon',
    h1: 'Die 15 häufigsten Traumsymbole',
    desc: 'Jeder Traum erzählt eine Geschichte. Entschlüssle die Botschaften deines Unterbewusstseins. KI-gestützt nach Freud, Jung und spirituellen Traditionen.',
    topLabel: 'Top gesucht',
    filterLabel: 'Nach Emotion filtern',
    filterAll: 'Alle',
    filterAngst: '😨 Angst',
    filterKontrolle: '🎯 Kontrolle',
    filterBeziehung: '💞 Beziehung',
    filterTransformation: '🦋 Transformation',
    cardSuffix: 'Freud · Jung · Spirituell · Varianten →',
    ctaH2: 'Dein Traum war nicht dabei?',
    ctaBtn1: '▸ Kostenlos starten',
    ctaBtn2: 'Traum individuell analysieren',
    guideHref: '/traumsymbole-guide/',
    guideLabel: 'Vollständiger Traumsymbole-Guide: Bedeutungen, Psychologie & Deutungsmethoden',
    footerDesc: 'Ethyria · Traumdeutung App mit KI',
    footerSub: 'Traumtagebuch & Traumanalyse für Android',
    footerBack: '← Zurück zur Startseite',
  },
  en: {
    pill: 'Dream Symbol Encyclopedia',
    h1: 'The 15 Most Common Dream Symbols',
    desc: 'Every dream tells a story. Decode the messages from your subconscious. AI-powered interpretation based on Freud, Jung and spiritual traditions.',
    topLabel: 'Most Searched',
    filterLabel: 'Filter by Emotion',
    filterAll: 'All',
    filterAngst: '😨 Fear',
    filterKontrolle: '🎯 Control',
    filterBeziehung: '💞 Relationships',
    filterTransformation: '🦋 Transformation',
    cardSuffix: 'Freud · Jung · Spiritual · Variations →',
    ctaH2: "Didn't find your dream?",
    ctaBtn1: '▸ Get Started Free',
    ctaBtn2: 'Analyze your dream individually',
    guideHref: '/en/traumsymbole-guide/',
    guideLabel: 'Complete Dream Symbols Guide: Meanings, Psychology & Interpretation Methods',
    footerDesc: 'Ethyria · AI Dream Interpretation App',
    footerSub: 'Dream Journal & Dream Analysis for Android',
    footerBack: '← Back to Home',
  },
  fr: {
    pill: 'Encyclopédie des Symboles de Rêves',
    h1: 'Les 15 Symboles de Rêves les Plus Courants',
    desc: 'Chaque rêve raconte une histoire. Déchiffrez les messages de votre subconscient. Interprétation par IA selon Freud, Jung et les traditions spirituelles.',
    topLabel: 'Les plus recherchés',
    filterLabel: 'Filtrer par émotion',
    filterAll: 'Tous',
    filterAngst: '😨 Peur',
    filterKontrolle: '🎯 Contrôle',
    filterBeziehung: '💞 Relations',
    filterTransformation: '🦋 Transformation',
    cardSuffix: 'Freud · Jung · Spirituel · Variantes →',
    ctaH2: 'Votre rêve n\'apparaît pas ici ?',
    ctaBtn1: '▸ Commencer gratuitement',
    ctaBtn2: 'Analyser mon rêve individuellement',
    guideHref: '/fr/traumsymbole-guide/',
    guideLabel: 'Guide complet des symboles de rêves : Significations, Psychologie & Méthodes d\'interprétation',
    footerDesc: 'Ethyria · App d\'interprétation des rêves par IA',
    footerSub: 'Journal de rêves & Analyse pour Android',
    footerBack: '← Retour à l\'accueil',
  },
  es: {
    pill: 'Enciclopedia de Símbolos Oníricos',
    h1: 'Los 15 Símbolos de Sueños Más Comunes',
    desc: 'Cada sueño cuenta una historia. Descifra los mensajes de tu subconsciente. Interpretación con IA según Freud, Jung y tradiciones espirituales.',
    topLabel: 'Los Más Buscados',
    filterLabel: 'Filtrar por Emoción',
    filterAll: 'Todos',
    filterAngst: '😨 Miedo',
    filterKontrolle: '🎯 Control',
    filterBeziehung: '💞 Relaciones',
    filterTransformation: '🦋 Transformación',
    cardSuffix: 'Freud · Jung · Espiritual · Variantes →',
    ctaH2: '¿No encuentras tu sueño?',
    ctaBtn1: '▸ Comienza gratis',
    ctaBtn2: 'Analizar mi sueño individualmente',
    guideHref: '/es/traumsymbole-guide/',
    guideLabel: 'Guía completa de símbolos de sueños: Significados, Psicología & Métodos de interpretación',
    footerDesc: 'Ethyria · App de Interpretación de Sueños con IA',
    footerSub: 'Diario de sueños & Análisis para Android',
    footerBack: '← Volver al inicio',
  },
  ru: {
    pill: 'Энциклопедия символов сновидений',
    h1: '15 самых распространённых символов снов',
    desc: 'Каждый сон рассказывает историю. Расшифруйте послания вашего подсознания. Интерпретация с ИИ по Фрейду, Юнгу и духовным традициям.',
    topLabel: 'Самые популярные',
    filterLabel: 'Фильтр по эмоции',
    filterAll: 'Все',
    filterAngst: '😨 Страх',
    filterKontrolle: '🎯 Контроль',
    filterBeziehung: '💞 Отношения',
    filterTransformation: '🦋 Трансформация',
    cardSuffix: 'Фрейд · Юнг · Духовное · Варианты →',
    ctaH2: 'Не нашли свой сон?',
    ctaBtn1: '▸ Начать бесплатно',
    ctaBtn2: 'Анализировать мой сон',
    guideHref: '/ru/traumsymbole-guide/',
    guideLabel: 'Полное руководство по символам снов: Значения, Психология & Методы интерпретации',
    footerDesc: 'Ethyria · Приложение для толкования снов на ИИ',
    footerSub: 'Дневник снов & Анализ для Android',
    footerBack: '← На главную',
  },
};

export const SYMBOLS: SymbolEntry[] = [
  {
    slug: 'fallen',
    img: 'falling.webp',
    categories: 'angst kontrolle',
    labels: {
      de: { name: 'Fallen', subtitle: 'Kontrollverlust, Loslassen, existenzielle Angst' },
      en: { name: 'Falling', subtitle: 'Loss of control, letting go, existential fear' },
      fr: { name: 'Chute', subtitle: 'Perte de contrôle, lâcher-prise, peur existentielle' },
      es: { name: 'Caída', subtitle: 'Pérdida de control, soltar, miedo existencial' },
      ru: { name: 'Падение', subtitle: 'Потеря контроля, отпускание, экзистенциальный страх' },
    },
  },
  {
    slug: 'zaehne-verlieren',
    img: 'zaehne.webp',
    categories: 'angst transformation',
    labels: {
      de: { name: 'Zähne verlieren', subtitle: 'Identitätskrise, Transformation, Selbstbild' },
      en: { name: 'Losing Teeth', subtitle: 'Identity crisis, transformation, self-image' },
      fr: { name: 'Perdre ses dents', subtitle: "Crise d'identité, transformation, image de soi" },
      es: { name: 'Perder los dientes', subtitle: 'Crisis de identidad, transformación, autoimagen' },
      ru: { name: 'Потеря зубов', subtitle: 'Кризис идентичности, трансформация, самооценка' },
    },
  },
  {
    slug: 'verfolgt-werden',
    img: 'chasing.webp',
    categories: 'angst',
    labels: {
      de: { name: 'Verfolgung', subtitle: 'Verdrängte Ängste, Schatten, Konfrontation' },
      en: { name: 'Being Chased', subtitle: 'Suppressed fears, shadow self, confrontation' },
      fr: { name: 'Être poursuivi', subtitle: 'Peurs refoulées, ombre intérieure, confrontation' },
      es: { name: 'Ser perseguido', subtitle: 'Miedos reprimidos, sombra interior, confrontación' },
      ru: { name: 'Преследование', subtitle: 'Подавленные страхи, теневое я, конфронтация' },
    },
  },
  {
    slug: 'fliegen',
    img: 'flying.webp',
    categories: 'transformation kontrolle',
    labels: {
      de: { name: 'Fliegen', subtitle: 'Freiheit, Kreativität, Perspektivwechsel' },
      en: { name: 'Flying', subtitle: 'Freedom, creativity, new perspectives' },
      fr: { name: 'Vol', subtitle: 'Liberté, créativité, changement de perspective' },
      es: { name: 'Vuelo', subtitle: 'Libertad, creatividad, cambio de perspectiva' },
      ru: { name: 'Полёт', subtitle: 'Свобода, творчество, новые перспективы' },
    },
  },
  {
    slug: 'wasser',
    img: 'water.webp',
    categories: 'transformation beziehung',
    labels: {
      de: { name: 'Wasser & Meer', subtitle: 'Emotionen, Unbewusstes, Reinigung' },
      en: { name: 'Water & Ocean', subtitle: 'Emotions, the unconscious, purification' },
      fr: { name: 'Eau et Océan', subtitle: 'Émotions, inconscient, purification' },
      es: { name: 'Agua y Océano', subtitle: 'Emociones, inconsciente, purificación' },
      ru: { name: 'Вода и Океан', subtitle: 'Эмоции, бессознательное, очищение' },
    },
  },
  {
    slug: 'tod',
    img: 'death.webp',
    categories: 'transformation angst',
    labels: {
      de: { name: 'Tod & Sterben', subtitle: 'Transformation, Neubeginn, Loslassen' },
      en: { name: 'Death & Dying', subtitle: 'Transformation, new beginnings, letting go' },
      fr: { name: 'Mort et Mourir', subtitle: 'Transformation, nouveaux départs, lâcher-prise' },
      es: { name: 'Muerte y Morir', subtitle: 'Transformación, nuevos comienzos, soltar' },
      ru: { name: 'Смерть и Умирание', subtitle: 'Трансформация, новые начала, отпускание' },
    },
  },
  {
    slug: 'schlangen',
    img: 'snake.webp',
    categories: 'angst transformation',
    labels: {
      de: { name: 'Schlangen', subtitle: 'Heilung, Gefahr, Kundalini, Erneuerung' },
      en: { name: 'Snakes', subtitle: 'Healing, danger, kundalini, renewal' },
      fr: { name: 'Serpents', subtitle: 'Guérison, danger, kundalini, renouveau' },
      es: { name: 'Serpientes', subtitle: 'Sanación, peligro, kundalini, renovación' },
      ru: { name: 'Змеи', subtitle: 'Исцеление, опасность, кундалини, обновление' },
    },
  },
  {
    slug: 'spinnen',
    img: 'spider.webp',
    categories: 'angst kontrolle',
    labels: {
      de: { name: 'Spinnen', subtitle: 'Kreativität, Kontrolle, weibliche Kraft' },
      en: { name: 'Spiders', subtitle: 'Creativity, control, feminine power' },
      fr: { name: 'Araignées', subtitle: 'Créativité, contrôle, pouvoir féminin' },
      es: { name: 'Arañas', subtitle: 'Creatividad, control, poder femenino' },
      ru: { name: 'Пауки', subtitle: 'Творчество, контроль, женская сила' },
    },
  },
  {
    slug: 'schwangerschaft',
    img: 'pregnancy.webp',
    categories: 'transformation beziehung',
    labels: {
      de: { name: 'Schwangerschaft', subtitle: 'Neuanfang, Kreativität, Wachstum' },
      en: { name: 'Pregnancy', subtitle: 'New beginnings, creativity, growth' },
      fr: { name: 'Grossesse', subtitle: 'Nouveaux départs, créativité, croissance' },
      es: { name: 'Embarazo', subtitle: 'Nuevos comienzos, creatividad, crecimiento' },
      ru: { name: 'Беременность', subtitle: 'Новые начала, творчество, рост' },
    },
  },
  {
    slug: 'auto-unfall',
    img: 'car-crash.webp',
    categories: 'kontrolle angst',
    labels: {
      de: { name: 'Auto & Unfall', subtitle: 'Lebensweg, Kontrollverlust, Richtung' },
      en: { name: 'Car & Accident', subtitle: 'Life path, loss of control, direction' },
      fr: { name: 'Voiture et Accident', subtitle: 'Chemin de vie, perte de contrôle, direction' },
      es: { name: 'Coche y Accidente', subtitle: 'Camino de vida, pérdida de control, dirección' },
      ru: { name: 'Автомобиль и Авария', subtitle: 'Жизненный путь, потеря контроля, направление' },
    },
  },
  {
    slug: 'nackt-sein',
    img: 'naked.webp',
    categories: 'angst beziehung',
    labels: {
      de: { name: 'Nackt sein', subtitle: 'Verletzlichkeit, Authentizität, Scham' },
      en: { name: 'Being Naked', subtitle: 'Vulnerability, authenticity, shame' },
      fr: { name: 'Être nu', subtitle: 'Vulnérabilité, authenticité, honte' },
      es: { name: 'Estar desnudo', subtitle: 'Vulnerabilidad, autenticidad, vergüenza' },
      ru: { name: 'Быть голым', subtitle: 'Уязвимость, подлинность, стыд' },
    },
  },
  {
    slug: 'pruefung',
    img: 'exam.webp',
    categories: 'angst kontrolle',
    labels: {
      de: { name: 'Prüfung & Versagen', subtitle: 'Leistungsdruck, Selbstbewertung, Angst' },
      en: { name: 'Exams & Failure', subtitle: 'Performance pressure, self-evaluation, anxiety' },
      fr: { name: 'Examens et Échec', subtitle: 'Pression de performance, auto-évaluation, anxiété' },
      es: { name: 'Exámenes y Fracaso', subtitle: 'Presión, autoevaluación, ansiedad' },
      ru: { name: 'Экзамены и Провал', subtitle: 'Давление, самооценка, тревога' },
    },
  },
  {
    slug: 'haus-raeume',
    img: 'house.webp',
    categories: 'kontrolle transformation',
    labels: {
      de: { name: 'Haus & Räume', subtitle: 'Psyche, Selbstbild, verborgene Potenziale' },
      en: { name: 'Houses & Rooms', subtitle: 'Psyche, self-image, hidden potential' },
      fr: { name: 'Maisons et Pièces', subtitle: 'Psyché, image de soi, potentiel caché' },
      es: { name: 'Casas y Habitaciones', subtitle: 'Psique, autoimagen, potencial oculto' },
      ru: { name: 'Дом и Комнаты', subtitle: 'Психика, самосознание, скрытый потенциал' },
    },
  },
  {
    slug: 'ex-partner',
    img: 'expartner.webp',
    categories: 'beziehung',
    labels: {
      de: { name: 'Ex-Partner', subtitle: 'Unverarbeitetes, Projektion, Abschluss' },
      en: { name: 'Ex-Partner', subtitle: 'Unresolved issues, projection, closure' },
      fr: { name: 'Ex-partenaire', subtitle: 'Questions non résolues, projection, clôture' },
      es: { name: 'Ex-pareja', subtitle: 'Asuntos pendientes, proyección, cierre' },
      ru: { name: 'Бывший партнёр', subtitle: 'Незавершённые дела, проекция, закрытие' },
    },
  },
  {
    slug: 'hunde-katzen',
    img: 'animals.webp',
    categories: 'beziehung kontrolle',
    labels: {
      de: { name: 'Hunde & Katzen', subtitle: 'Treue, Instinkt, Intuition, Unabhängigkeit' },
      en: { name: 'Dogs & Cats', subtitle: 'Loyalty, instinct, intuition, independence' },
      fr: { name: 'Chiens et Chats', subtitle: 'Loyauté, instinct, intuition, indépendance' },
      es: { name: 'Perros y Gatos', subtitle: 'Lealtad, instinto, intuición, independencia' },
      ru: { name: 'Собаки и Кошки', subtitle: 'Верность, инстинкт, интуиция, независимость' },
    },
  },
];

// Quick-access slugs for "Top gesucht" bar (same order in all langs)
export const TOP_SLUGS = ['wasser', 'zaehne-verlieren', 'fallen', 'verfolgt-werden', 'fliegen', 'schlangen'];
