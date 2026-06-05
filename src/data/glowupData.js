export const FOOD_ESTIMATES = [
  {
    dish: "Салат з куркою",
    calories: 420,
    ingredients: "курка, зелень, помідори, огірок, сир, легка заправка",
    macros: "білки 35 г • жири 18 г • вуглеводи 22 г",
    note: "Багато білка, легкий варіант після тренування.",
  },
  {
    dish: "Вівсянка з фруктами",
    calories: 350,
    ingredients: "вівсянка, ягоди або банан, молоко/йогурт, горіхи",
    macros: "білки 12 г • жири 9 г • вуглеводи 55 г",
    note: "Добре підходить на сніданок і дає довгу енергію.",
  },
  {
    dish: "Паста з овочами",
    calories: 610,
    ingredients: "паста, томати, перець, оливкова олія, зелень",
    macros: "білки 18 г • жири 20 г • вуглеводи 88 г",
    note: "Смачно, але порцію краще тримати помірною.",
  },
  {
    dish: "Омлет з овочами",
    calories: 290,
    ingredients: "яйця, шпинат, помідори, перець, трохи сиру",
    macros: "білки 24 г • жири 18 г • вуглеводи 9 г",
    note: "Легка білкова страва, гарна для ранку.",
  },
];

export const MOTIVATION_QUOTES = [
  {
    topic: "Тіло",
    text: "Сильне тіло будується не ідеальним днем, а повторенням маленьких дій.",
  },
  {
    topic: "Ментальне здоров'я",
    text: "Спокій теж є прогресом. Сьогодні достатньо зробити один добрий крок для себе.",
  },
  {
    topic: "Фокус",
    text: "Не треба контролювати весь день. Почни з наступних 15 хвилин.",
  },
  {
    topic: "Заробіток",
    text: "Гроші люблять навички, дисципліну і сміливість просити більше за свою цінність.",
  },
  {
    topic: "Ріст",
    text: "Кожна нова звичка - це інвестиція в людину, якою ти стаєш.",
  },
  {
    topic: "Впевненість",
    text: "Ти не маєш бути готовою на 100%, щоб почати. Готовність приходить у русі.",
  },
];

export const getDailyMotivationIndex = () => {
  const todayKey = new Date().toLocaleDateString("sv-SE");
  let total = 0;

  for (const character of todayKey) {
    total += character.charCodeAt(0);
  }

  return total % MOTIVATION_QUOTES.length;
};

export const DEFAULT_DAILY_QUOTES = [
  "Кожен день - це новий шанс стати кращою версією себе.",
  "Маленькі кроки ведуть до великих досягнень.",
  "Зроби сьогодні те, за що твій майбутній я буде тобі вдячний.",
  "Успіх - це сума маленьких зусиль, що повторюються день у день.",
  "Твоя єдина межа - це твоя уява.",
  "Дисципліна - це міст між цілями та їх досягненням.",
  ...MOTIVATION_QUOTES.map((quote) => quote.text),
];

export const AI_DAILY_MOTIVATIONS = [
  "Не треба ідеально. Треба просто продовжувати 🔥",
  "Маленькі кроки щодня створюють велику зміну.",
  "Ти вже робиш більше, ніж учора. Не знецінюй це.",
  "Один пропуск не руйнує прогрес. Повернись сьогодні.",
  "Твоє тіло змінюється від стабільності, а не від паніки.",
  "GlowUp починається не з понеділка, а з маленької дії зараз 👀",
  "Сьогодні твоя задача — не здатися.",
  "Ти не починаєш з нуля. Ти починаєш з досвіду.",
  "Навіть 10 хвилин тренування — це вже перемога.",
  "Ти ближче до цілі, ніж думаєш 💪",
];

export const MOTIVATION_THEME_CLASSES = {
  light: {
    box: "bg-white text-gray-900 border-gray-100",
    muted: "text-gray-500",
    button: "bg-gray-200 text-gray-900",
    accent: "text-blue-600",
  },
  dark: {
    box: "bg-slate-900 text-slate-50 border-slate-700",
    muted: "text-slate-400",
    button: "bg-slate-700 text-white",
    accent: "text-sky-300",
  },
  lavender: {
    box: "bg-purple-50 text-purple-950 border-purple-200",
    muted: "text-purple-600",
    button: "bg-purple-200 text-purple-950",
    accent: "text-purple-700",
  },
  cyberpunk: {
    box: "bg-black text-green-400 border-green-400",
    muted: "text-cyan-300",
    button: "bg-zinc-900 text-cyan-300 border border-green-400",
    accent: "text-green-400",
  },
};

export const APP_THEMES = {
  glow: {
    name: "GlowUp",
    page: "bg-gradient-to-br from-pink-100 via-white to-purple-100",
    shell: "bg-white text-gray-900",
    title: "from-pink-500 to-purple-600",
    accent: "from-pink-500 to-purple-600",
  },
  ocean: {
    name: "Ocean",
    page: "bg-gradient-to-br from-cyan-100 via-white to-emerald-100",
    shell: "bg-white text-slate-900",
    title: "from-cyan-500 to-emerald-500",
    accent: "from-cyan-500 to-emerald-500",
  },
  night: {
    name: "Night",
    page: "bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950",
    shell: "bg-slate-900 text-slate-50",
    title: "from-sky-300 to-fuchsia-300",
    accent: "from-sky-500 to-fuchsia-500",
  },
  forest: {
    name: "Forest",
    page: "bg-gradient-to-br from-lime-100 via-white to-green-200",
    shell: "bg-white text-green-950",
    title: "from-lime-600 to-green-700",
    accent: "from-lime-500 to-green-600",
  },
};

export const CHARLIE_VOICE_PRESETS = {
  calm: { label: "Спокійний", rate: 0.9, pitch: 0.95 },
  bright: { label: "Енергійний", rate: 1.08, pitch: 1.15 },
  coach: { label: "Фітнес-тренер", rate: 1.04, pitch: 1.0 },
  soft: { label: "М'який", rate: 0.85, pitch: 1.05 },
};

export const DASHBOARD_THEME_STYLES = {
  glow: {
    background: "linear-gradient(135deg, #08071a 0%, #120b2f 55%, #1a0f36 100%)",
  },
  ocean: {
    background: "linear-gradient(135deg, #041822 0%, #06364a 55%, #0f766e 100%)",
  },
  night: {
    background: "linear-gradient(135deg, #020617 0%, #111827 55%, #312e81 100%)",
  },
  forest: {
    background: "linear-gradient(135deg, #04130b 0%, #064e3b 55%, #166534 100%)",
  },
};

export const APP_LANGUAGES = [
  ["uk", "Українська"],
  ["en", "English"],
  ["pl", "Polski"],
  ["de", "Deutsch"],
  ["fr", "Français"],
  ["es", "Español"],
  ["it", "Italiano"],
  ["pt", "Português"],
  ["nl", "Nederlands"],
  ["sv", "Svenska"],
  ["no", "Norsk"],
  ["da", "Dansk"],
  ["fi", "Suomi"],
  ["et", "Eesti"],
  ["lv", "Latviešu"],
  ["lt", "Lietuvių"],
  ["cs", "Čeština"],
  ["sk", "Slovenčina"],
  ["sl", "Slovenščina"],
  ["hr", "Hrvatski"],
  ["sr", "Srpski"],
  ["bg", "Български"],
  ["ro", "Română"],
  ["hu", "Magyar"],
  ["el", "Ελληνικά"],
  ["tr", "Türkçe"],
  ["ar", "العربية"],
  ["he", "עברית"],
  ["fa", "فارسی"],
  ["hi", "हिन्दी"],
  ["bn", "বাংলা"],
  ["ur", "اردو"],
  ["id", "Bahasa Indonesia"],
  ["ms", "Bahasa Melayu"],
  ["vi", "Tiếng Việt"],
  ["th", "ไทย"],
  ["ko", "한국어"],
  ["ja", "日本語"],
  ["zh", "中文"],
  ["sw", "Kiswahili"],
  ["af", "Afrikaans"],
  ["sq", "Shqip"],
  ["az", "Azərbaycanca"],
  ["ka", "ქართული"],
  ["hy", "Հայերեն"],
  ["is", "Íslenska"],
  ["ga", "Gaeilge"],
  ["mt", "Malti"],
  ["mk", "Македонски"],
  ["bs", "Bosanski"],
  ["ca", "Català"],
  ["eu", "Euskara"],
  ["gl", "Galego"],
];

export const SPEECH_LANGUAGE_CODES = {
  uk: "uk-UA",
  en: "en-US",
  pl: "pl-PL",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  it: "it-IT",
  pt: "pt-PT",
  nl: "nl-NL",
  sv: "sv-SE",
  no: "nb-NO",
  da: "da-DK",
  fi: "fi-FI",
  et: "et-EE",
  lv: "lv-LV",
  lt: "lt-LT",
  cs: "cs-CZ",
  sk: "sk-SK",
  sl: "sl-SI",
  hr: "hr-HR",
  sr: "sr-RS",
  bg: "bg-BG",
  ro: "ro-RO",
  hu: "hu-HU",
  el: "el-GR",
  tr: "tr-TR",
  ar: "ar-SA",
  he: "he-IL",
  fa: "fa-IR",
  hi: "hi-IN",
  bn: "bn-BD",
  ur: "ur-PK",
  id: "id-ID",
  ms: "ms-MY",
  vi: "vi-VN",
  th: "th-TH",
  ko: "ko-KR",
  ja: "ja-JP",
  zh: "zh-CN",
  sw: "sw-KE",
  af: "af-ZA",
  sq: "sq-AL",
  az: "az-AZ",
  ka: "ka-GE",
  hy: "hy-AM",
  is: "is-IS",
  ga: "ga-IE",
  mt: "mt-MT",
  mk: "mk-MK",
  bs: "bs-BA",
  ca: "ca-ES",
  eu: "eu-ES",
  gl: "gl-ES",
};

export const CHARLIE_TEST_PHRASES = {
  uk: "Привіт, я Чарлі. Це тест мого голосу.",
  en: "Hi, I am Charlie. This is a test of my voice.",
  pl: "Cześć, jestem Charlie. To jest test mojego głosu.",
  de: "Hallo, ich bin Charlie. Das ist ein Test meiner Stimme.",
  fr: "Bonjour, je suis Charlie. Ceci est un test de ma voix.",
  es: "Hola, soy Charlie. Esta es una prueba de mi voz.",
  it: "Ciao, sono Charlie. Questa è una prova della mia voce.",
  pt: "Olá, eu sou Charlie. Este é um teste da minha voz.",
};

export const TRANSLATIONS = {
  uk: {
    settings: "Налаштування",
    settingsSubtitle: "звук, дозволи, дизайн і мова",
    language: "Мова програми",
    languageNote: "Мова, яку ти просила не додавати, відсутня у списку.",
    appDesign: "Дизайн програми",
    charlieSound: "Звук Чарлі",
    permissions: "Дозволи",
    allowNotifications: "Дозволити повідомлення",
    home: "Головна",
    progress: "Прогрес",
    nutrition: "Харчування",
    training: "Тренування",
    habits: "Звички",
    video: "Відео",
    recipes: "Рецепти",
    greeting: "Привіт, Анастасія!",
    greetingSub: "Ти на крок ближче до своєї найкращої версії",
    progressStats: "Прогрес і статистика",
    progressText: "Тут видно, скільки ти вже зробила, пройшла і як рухаєшся до цілей.",
    nutritionText: "Усе про їжу: калорії, фото їжі, рецепти, склад і корисні відео.",
    trainingText: "Усе про тренування: вправи, таймер, тривалість і витрачені калорії.",
    caloriesToday: "Калорії сьогодні",
    photoFood: "Сфотографувати їжу",
    recipesMeals: "Рецепти та страви",
    chooseWorkout: "Вибери тренування",
    workoutTimer: "Таймер тренування",
    start: "Старт",
    reset: "Скинути",
  },
  en: {
    settings: "Settings",
    settingsSubtitle: "sound, permissions, design and language",
    language: "App language",
    languageNote: "The excluded language is not available in this list.",
    appDesign: "App design",
    charlieSound: "Charlie sound",
    permissions: "Permissions",
    allowNotifications: "Allow notifications",
    home: "Home",
    progress: "Progress",
    nutrition: "Nutrition",
    training: "Training",
    habits: "Habits",
    video: "Video",
    recipes: "Recipes",
    greeting: "Hi, Anastasia!",
    greetingSub: "You are one step closer to your best version",
    progressStats: "Progress and statistics",
    progressText: "See what you have done, walked, and how you are moving toward your goals.",
    nutritionText: "Everything about food: calories, food photos, recipes, ingredients and videos.",
    trainingText: "Everything about workouts: exercises, timer, duration and burned calories.",
    caloriesToday: "Calories today",
    photoFood: "Photograph food",
    recipesMeals: "Recipes and meals",
    chooseWorkout: "Choose workout",
    workoutTimer: "Workout timer",
    start: "Start",
    reset: "Reset",
  },
  pl: {
    settings: "Ustawienia",
    settingsSubtitle: "dźwięk, uprawnienia, wygląd i język",
    language: "Język aplikacji",
    languageNote: "Wykluczony język nie jest dostępny na liście.",
    appDesign: "Wygląd aplikacji",
    charlieSound: "Dźwięk Charliego",
    permissions: "Uprawnienia",
    allowNotifications: "Zezwól na powiadomienia",
    home: "Główna",
    progress: "Postęp",
    nutrition: "Odżywianie",
    training: "Trening",
    habits: "Nawyki",
    video: "Wideo",
    recipes: "Przepisy",
    greeting: "Cześć, Anastazjo!",
    greetingSub: "Jesteś krok bliżej swojej najlepszej wersji",
    progressStats: "Postęp i statystyki",
    progressText: "Tutaj widać, ile już zrobiłaś, przeszłaś i jak idziesz do celu.",
    nutritionText: "Wszystko o jedzeniu: kalorie, zdjęcia, przepisy, skład i filmy.",
    trainingText: "Wszystko o treningu: ćwiczenia, timer, czas i spalone kalorie.",
    caloriesToday: "Kalorie dzisiaj",
    photoFood: "Zrób zdjęcie jedzenia",
    recipesMeals: "Przepisy i dania",
    chooseWorkout: "Wybierz trening",
    workoutTimer: "Timer treningu",
    start: "Start",
    reset: "Reset",
  },
  de: {
    settings: "Einstellungen",
    settingsSubtitle: "Ton, Berechtigungen, Design und Sprache",
    language: "App-Sprache",
    languageNote: "Die ausgeschlossene Sprache ist in dieser Liste nicht verfügbar.",
    appDesign: "App-Design",
    charlieSound: "Charlies Stimme",
    permissions: "Berechtigungen",
    allowNotifications: "Benachrichtigungen erlauben",
    home: "Start",
    progress: "Fortschritt",
    nutrition: "Ernährung",
    training: "Training",
    habits: "Gewohnheiten",
    video: "Video",
    recipes: "Rezepte",
    greeting: "Hallo, Anastasia!",
    greetingSub: "Du bist deiner besten Version einen Schritt näher",
    progressStats: "Fortschritt und Statistik",
    progressText: "Hier siehst du, was du geschafft hast und wie du deinen Zielen näher kommst.",
    nutritionText: "Alles über Essen: Kalorien, Fotos, Rezepte, Zutaten und Videos.",
    trainingText: "Alles über Training: Übungen, Timer, Dauer und verbrannte Kalorien.",
    caloriesToday: "Kalorien heute",
    photoFood: "Essen fotografieren",
    recipesMeals: "Rezepte und Gerichte",
    chooseWorkout: "Training wählen",
    workoutTimer: "Trainingstimer",
    start: "Start",
    reset: "Zurücksetzen",
  },
  es: {
    settings: "Ajustes",
    settingsSubtitle: "sonido, permisos, diseño e idioma",
    language: "Idioma de la app",
    languageNote: "El idioma excluido no está disponible en esta lista.",
    appDesign: "Diseño de la app",
    charlieSound: "Sonido de Charlie",
    permissions: "Permisos",
    allowNotifications: "Permitir notificaciones",
    home: "Inicio",
    progress: "Progreso",
    nutrition: "Nutrición",
    training: "Entrenamiento",
    habits: "Hábitos",
    video: "Video",
    recipes: "Recetas",
    greeting: "¡Hola, Anastasia!",
    greetingSub: "Estás un paso más cerca de tu mejor versión",
    progressStats: "Progreso y estadísticas",
    progressText: "Aquí ves lo que hiciste, caminaste y cómo avanzas hacia tus metas.",
    nutritionText: "Todo sobre comida: calorías, fotos, recetas, ingredientes y videos.",
    trainingText: "Todo sobre entrenamientos: ejercicios, temporizador, duración y calorías.",
    caloriesToday: "Calorías hoy",
    photoFood: "Fotografiar comida",
    recipesMeals: "Recetas y platos",
    chooseWorkout: "Elegir entrenamiento",
    workoutTimer: "Temporizador",
    start: "Iniciar",
    reset: "Reiniciar",
  },
};

export const WORKOUT_CARDS = [
  {
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&h=420&fit=crop",
    title: "HIIT тренування для схуднення",
    meta: "25 хв • 320 ккал • Для всіх рівнів",
    time: "20:15",
    videoUrl: "https://www.youtube.com/embed/ml6cT4AZdqI?autoplay=1",
  },
  {
    image: "https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=900&h=420&fit=crop",
    title: "Силове тренування вдома",
    meta: "35 хв • 410 ккал • Середній рівень",
    time: "28:40",
    videoUrl: "https://www.youtube.com/embed/U0bhE67HuDY?autoplay=1",
  },
  {
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=900&h=420&fit=crop",
    title: "Йога для спокою",
    meta: "18 хв • 120 ккал • Легкий рівень",
    time: "18:05",
    videoUrl: "https://www.youtube.com/embed/v7AYKMP6rOE?autoplay=1",
  },
];

export const WEEKLY_WORKOUT_SPLIT = [
  {
    id: "legs-glutes-1",
    day: "День 1",
    title: "Ноги + сідниці",
    focus: "Сила, форма сідниць і стабільність колін.",
    duration: 38,
    accent: "from-pink-500 to-orange-400",
    emoji: "🍑",
    exercises: [
      { name: "Присідання", sets: "4 підходи x 12", timer: "45 сек" },
      { name: "Glute bridge", sets: "4 підходи x 15", timer: "40 сек" },
      { name: "Випади назад", sets: "3 підходи x 10/нога", timer: "45 сек" },
      { name: "Румунська тяга", sets: "3 підходи x 12", timer: "50 сек" },
    ],
  },
  {
    id: "arms-triceps",
    day: "День 2",
    title: "Руки + трицепс",
    focus: "Тонус рук, плечі та контроль корпусу.",
    duration: 30,
    accent: "from-fuchsia-500 to-pink-400",
    emoji: "💪",
    exercises: [
      { name: "Віджимання від опори", sets: "4 підходи x 10", timer: "40 сек" },
      { name: "Triceps dips", sets: "3 підходи x 12", timer: "35 сек" },
      { name: "Підйоми рук", sets: "3 підходи x 14", timer: "35 сек" },
      { name: "Планка з торканням плечей", sets: "3 підходи x 20", timer: "45 сек" },
    ],
  },
  {
    id: "back-posture",
    day: "День 3",
    title: "Спина + постава",
    focus: "Рівна спина, лопатки і менше напруги в шиї.",
    duration: 32,
    accent: "from-sky-400 to-pink-400",
    emoji: "🧘",
    exercises: [
      { name: "Superman hold", sets: "4 підходи x 30 сек", timer: "30 сек" },
      { name: "Bird dog", sets: "3 підходи x 12/сторона", timer: "40 сек" },
      { name: "Тяга рушника", sets: "3 підходи x 15", timer: "45 сек" },
      { name: "Wall angels", sets: "3 підходи x 12", timer: "35 сек" },
    ],
  },
  {
    id: "cardio-abs",
    day: "День 4",
    title: "Кардіо + прес",
    focus: "Витривалість, пульс і сильний центр.",
    duration: 28,
    accent: "from-orange-400 to-rose-500",
    emoji: "🔥",
    exercises: [
      { name: "Jumping jacks", sets: "4 раунди", timer: "40 сек" },
      { name: "Mountain climbers", sets: "4 раунди", timer: "35 сек" },
      { name: "Dead bug", sets: "3 підходи x 12", timer: "40 сек" },
      { name: "Планка", sets: "3 підходи", timer: "45 сек" },
    ],
  },
  {
    id: "glutes-legs-2",
    day: "День 5",
    title: "Сідниці + ноги",
    focus: "Другий акцент тижня на форму, силу і контроль.",
    duration: 36,
    accent: "from-pink-500 to-amber-400",
    emoji: "⚡",
    exercises: [
      { name: "Hip thrust", sets: "4 підходи x 12", timer: "50 сек" },
      { name: "Bulgarian split squat", sets: "3 підходи x 10/нога", timer: "50 сек" },
      { name: "Side leg raises", sets: "3 підходи x 18", timer: "35 сек" },
      { name: "Calf raises", sets: "3 підходи x 20", timer: "30 сек" },
    ],
  },
  {
    id: "upper-body",
    day: "День 6",
    title: "Верх тіла",
    focus: "Плечі, груди, спина і красивий силует.",
    duration: 34,
    accent: "from-purple-500 to-pink-500",
    emoji: "🏋️",
    exercises: [
      { name: "Віджимання", sets: "4 підходи x 8-12", timer: "45 сек" },
      { name: "Shoulder taps", sets: "3 підходи x 20", timer: "40 сек" },
      { name: "Reverse snow angels", sets: "3 підходи x 12", timer: "35 сек" },
      { name: "Планка на ліктях", sets: "3 підходи", timer: "45 сек" },
    ],
  },
  {
    id: "recovery-stretch",
    day: "День 7",
    title: "Recovery / stretching",
    focus: "Відновлення, мобільність і спокійна нервова система.",
    duration: 22,
    accent: "from-emerald-400 to-pink-400",
    emoji: "🌿",
    exercises: [
      { name: "Cat-cow", sets: "2 підходи x 10", timer: "30 сек" },
      { name: "Розтяжка згиначів стегна", sets: "2 підходи/сторона", timer: "60 сек" },
      { name: "Child's pose", sets: "2 підходи", timer: "60 сек" },
      { name: "Дихання 4-6", sets: "4 цикли", timer: "60 сек" },
    ],
  },
];

export const FOOD_VIDEO_CARDS = [
  {
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=420&h=260&fit=crop",
    title: "Що їсти, щоб схуднути",
    time: "12:45",
    calories: "350-450 ккал",
    ingredients: ["білок: курка, яйця або риба", "овочі", "крупа або картопля", "вода"],
    steps: [
      "Збери тарілку: половина овочі, чверть білок, чверть складні вуглеводи.",
      "Додай 1 чайну ложку оливкової олії або інший корисний жир.",
      "Їж повільно і зупинись, коли відчуваєш ситість.",
    ],
  },
  {
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=420&h=260&fit=crop",
    title: "Раціон на день для схуднення",
    time: "15:30",
    calories: "1500-1800 ккал/день",
    ingredients: ["сніданок: вівсянка або яйця", "обід: білок + крупа", "вечеря: білок + овочі", "перекус: йогурт або фрукти"],
    steps: [
      "Сплануй 3 основні прийоми їжі та 1 легкий перекус.",
      "У кожному прийомі залиш джерело білка.",
      "Ввечері зроби легшу тарілку: більше овочів, менше швидких вуглеводів.",
    ],
  },
  {
    image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=420&h=260&fit=crop",
    title: "5 смачних та корисних сніданків",
    time: "8:20",
    calories: "280-420 ккал",
    ingredients: ["вівсянка", "яйця", "ягоди", "йогурт", "авокадо", "цільнозерновий хліб"],
    steps: [
      "Обери основу: вівсянка, яйця або йогурт.",
      "Додай фрукт або ягоди для смаку.",
      "Додай білок, щоб сніданок краще насичував.",
    ],
  },
];

export const RECIPE_CARDS = [
  {
    image: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=420&h=260&fit=crop",
    title: "Вівсянка з ягодами",
    calories: "320 ккал",
    ingredients: ["50 г вівсянки", "150 мл молока або води", "жменя ягід", "1 ч. л. меду", "10 г горіхів"],
    steps: [
      "Залий вівсянку молоком або водою і вари 5-7 хвилин.",
      "Додай ягоди, мед і горіхи.",
      "Перемішай і подавай теплою.",
    ],
  },
  {
    image: "https://images.unsplash.com/photo-1604909052743-94e838986d24?w=420&h=260&fit=crop",
    title: "Куряче філе з овочами",
    calories: "450 ккал",
    ingredients: ["150 г курячого філе", "перець", "броколі", "морква", "1 ч. л. оливкової олії", "спеції"],
    steps: [
      "Наріж філе та овочі невеликими шматочками.",
      "Обсмаж або запечи курку зі спеціями до готовності.",
      "Додай овочі і готуй ще 7-10 хвилин.",
    ],
  },
  {
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=420&h=260&fit=crop",
    title: "Салат з кіноа",
    calories: "280 ккал",
    ingredients: ["80 г готової кіноа", "огірок", "помідори", "зелень", "лимонний сік", "фета за бажанням"],
    steps: [
      "Відвари кіноа і дай їй охолонути.",
      "Наріж овочі та зелень.",
      "Змішай усе з лимонним соком і додай фету за бажанням.",
    ],
  },
];

export const readJson = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export const getTodayWorkoutIndex = () => {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
};

export const getWorkoutWeekKey = () => {
  const date = new Date();
  const day = date.getDay() || 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
};

export const WORKOUT_DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

export const getLocalDateKey = (date = new Date()) => {
  const localDate = new Date(date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, 10);
};

export const getLastDateKeys = (days = 7) =>
  Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return getLocalDateKey(date);
  });

export const clampScore = (value) =>
  Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

export const XP_PER_LEVEL = 250;

export const ACHIEVEMENT_DEFINITIONS = [
  {
    id: "first-workout",
    title: "Перше тренування",
    description: "Заверши перше тренування у weekly split.",
    icon: "🏁",
    accent: "from-pink-400 to-orange-400",
  },
  {
    id: "workout-7",
    title: "7 днів тренувань",
    description: "Назбирай 7 днів із виконаними тренуваннями.",
    icon: "🔥",
    accent: "from-orange-300 to-pink-500",
  },
  {
    id: "workout-30",
    title: "30 днів тренувань",
    description: "Дійди до 30 тренувальних днів.",
    icon: "👑",
    accent: "from-yellow-300 to-orange-500",
  },
  {
    id: "first-food",
    title: "Перша їжа в щоденнику",
    description: "Додай перший запис у food diary.",
    icon: "🍽️",
    accent: "from-emerald-300 to-cyan-400",
  },
  {
    id: "first-ai-scan",
    title: "Перший AI food scan",
    description: "Додай перший AI scan у щоденник.",
    icon: "🤖",
    accent: "from-purple-300 to-pink-500",
  },
  {
    id: "water-7",
    title: "7 днів водної цілі",
    description: "Досягни водної цілі 7 різних днів.",
    icon: "💧",
    accent: "from-cyan-300 to-blue-500",
  },
  {
    id: "sleep-7",
    title: "7 днів сну по цілі",
    description: "Виконай ціль сну 7 різних днів.",
    icon: "🌙",
    accent: "from-indigo-300 to-purple-500",
  },
  {
    id: "level-5",
    title: "Level 5",
    description: "Дійди до 5 рівня GlowUp.",
    icon: "⭐",
    accent: "from-fuchsia-300 to-pink-500",
  },
  {
    id: "level-10",
    title: "Level 10",
    description: "Дійди до 10 рівня GlowUp.",
    icon: "💎",
    accent: "from-sky-300 to-purple-500",
  },
  {
    id: "score-80",
    title: "GlowUp Score 80+",
    description: "Підніми GlowUp Score до 80 або вище.",
    icon: "✨",
    accent: "from-pink-400 to-purple-500",
  },
];

export const CHALLENGE_DEFINITIONS = [
  {
    id: "workout-no-skip-7",
    title: "7 днів без пропуску тренувань",
    description: "Тримай тренувальну серію 7 днів поспіль.",
    target: 7,
    unit: "днів",
    icon: "🔥",
    accent: "from-orange-400 to-pink-500",
  },
  {
    id: "water-goal-7",
    title: "7 днів водної цілі",
    description: "Досягни своєї водної цілі 7 різних днів.",
    target: 7,
    unit: "днів",
    icon: "💧",
    accent: "from-cyan-300 to-blue-500",
  },
  {
    id: "sleep-goal-7",
    title: "7 днів сну по цілі",
    description: "Закрий ціль сну 7 різних днів.",
    target: 7,
    unit: "днів",
    icon: "🌙",
    accent: "from-indigo-300 to-purple-500",
  },
  {
    id: "ai-food-scans-5",
    title: "5 AI food scans",
    description: "Додай 5 AI-сканів їжі в щоденник.",
    target: 5,
    unit: "scan",
    icon: "🤖",
    accent: "from-purple-300 to-pink-500",
  },
  {
    id: "food-diary-10",
    title: "10 записів у food diary",
    description: "Додай 10 записів харчування вручну або через AI.",
    target: 10,
    unit: "записів",
    icon: "🍽️",
    accent: "from-emerald-300 to-cyan-400",
  },
  {
    id: "posture-workouts-3",
    title: "3 тренування на поставу",
    description: "Виконай 3 тренування зі спиною та поставою.",
    target: 3,
    unit: "тренування",
    icon: "🧘",
    accent: "from-sky-300 to-emerald-400",
  },
  {
    id: "steps-10000-5",
    title: "10 000 кроків 5 днів",
    description: "Пройди 10 000+ кроків у 5 різних днів.",
    target: 5,
    unit: "днів",
    icon: "👟",
    accent: "from-pink-400 to-purple-500",
  },
];

export const getGlowUpLevelInfo = (totalXp = 0) => {
  const safeXp = Math.max(0, Number(totalXp) || 0);
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const currentLevelXp = safeXp % XP_PER_LEVEL;
  const progress = Math.round((currentLevelXp / XP_PER_LEVEL) * 100);

  return {
    level,
    currentLevelXp,
    nextLevelXp: XP_PER_LEVEL,
    progress,
  };
};

export const timeToMinutes = (value) => {
  if (!value || !value.includes(":")) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

export const getSleepHours = (bedTime, wakeTime) => {
  const start = timeToMinutes(bedTime);
  const end = timeToMinutes(wakeTime);
  if (start === null || end === null) return 0;

  let diff = end - start;
  if (diff <= 0) diff += 24 * 60;

  return Math.round((diff / 60) * 10) / 10;
};

export const getSleepQuality = (hours, goal) => {
  if (!hours) {
    return {
      label: "додай час",
      tone: "text-white/55",
      badge: "bg-white/10 text-white/60",
    };
  }

  if (hours < 6) {
    return {
      label: "погано",
      tone: "text-rose-200",
      badge: "bg-rose-500/20 text-rose-100",
    };
  }

  if (hours < goal - 0.5) {
    return {
      label: "нормально",
      tone: "text-amber-200",
      badge: "bg-amber-400/20 text-amber-100",
    };
  }

  return {
    label: "добре",
    tone: "text-emerald-200",
    badge: "bg-emerald-400/20 text-emerald-100",
  };
};

export const getSleepAdvice = (hours, goal) => {
  if (!hours) {
    return "Додай час сну, і Чарлі підкаже, як краще відновитися сьогодні.";
  }

  if (hours < 6) {
    return "Сьогодні краще зробити легше тренування, випити воду і лягти спати на 30-60 хв раніше.";
  }

  if (hours < goal - 0.5) {
    return "Сон майже в нормі. Спробуй прибрати телефон за 30 хв до сну і зробити спокійний вечірній ритуал.";
  }

  return "Класне відновлення. Сьогодні тілу буде легше тримати енергію, апетит і тренування.";
};

export const getReminderDelay = (timeValue) => {
  const minutes = timeToMinutes(timeValue);
  if (minutes === null) return null;

  const now = new Date();
  const target = new Date(now);
  target.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);

  return target.getTime() - now.getTime();
};

export const addDaysToDateKey = (dateKey, days) => {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return getLocalDateKey(date);
};

export const getWorkoutCompletedDates = (weeklyLog) =>
  new Set(
    Object.values(weeklyLog)
      .filter((item) => item?.completed)
      .map((item) => item.completedDate || item.completedAt?.slice(0, 10))
      .filter(Boolean)
  );

export const getWorkoutStreakCount = (weeklyLog) => {
  const completedDates = getWorkoutCompletedDates(weeklyLog);
  const todayKey = getLocalDateKey();
  let cursor = completedDates.has(todayKey)
    ? new Date()
    : new Date(`${todayKey}T00:00:00`);

  if (!completedDates.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;

  while (completedDates.has(getLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

export const WORKOUT_DIFFICULTY_LEVELS = {
  beginner: {
    label: "Новачок",
    shortLabel: "Легко",
    sets: 2,
    reps: 10,
    timerSeconds: 30,
    durationMultiplier: 0.78,
    intensity: "Легка",
    note: "Спокійний темп, більше контролю техніки.",
  },
  intermediate: {
    label: "Середній",
    shortLabel: "Баланс",
    sets: 3,
    reps: 12,
    timerSeconds: 45,
    durationMultiplier: 1,
    intensity: "Середня",
    note: "Оптимальний темп для стабільного прогресу.",
  },
  advanced: {
    label: "Просунутий",
    shortLabel: "Сильно",
    sets: 4,
    reps: 15,
    timerSeconds: 60,
    durationMultiplier: 1.24,
    intensity: "Висока",
    note: "Більше обсягу, менше відпочинку, сильніший фокус.",
  },
};

export const WORKOUT_DIFFICULTY_ORDER = ["beginner", "intermediate", "advanced"];

export const WORKOUT_GOAL_CONFIGS = {
  weightLoss: {
    label: "Схуднення",
    shortLabel: "Кардіо",
    note: "Більше кардіо, активних вправ і коротких фінішерів.",
    emphasis: "кардіо + активність",
    accent: "from-orange-400 to-pink-500",
    extraExercise: "Кардіо-фінішер",
    timed: true,
  },
  tone: {
    label: "Підтягнути тіло",
    shortLabel: "Full body",
    note: "Більше full body рухів для тонусу і красивого силуету.",
    emphasis: "full body + тонус",
    accent: "from-pink-500 to-purple-500",
    extraExercise: "Full body combo",
    timed: true,
  },
  muscle: {
    label: "Набір мʼязів",
    shortLabel: "Сила",
    note: "Більше силових підходів, контроль темпу і прогресивне навантаження.",
    emphasis: "силові вправи",
    accent: "from-fuchsia-500 to-orange-400",
    extraExercise: "Силовий добір",
    timed: false,
  },
  posture: {
    label: "Постава / гіперлордоз",
    shortLabel: "Постава",
    note: "Більше спини, пресу, сідниць і розтяжки для контролю постави.",
    emphasis: "спина + прес + сідниці",
    accent: "from-sky-400 to-emerald-400",
    extraExercise: "Корекція постави",
    timed: true,
  },
  endurance: {
    label: "Витривалість",
    shortLabel: "Круги",
    note: "Більше кругових тренувань, ритму і стабільної роботи серця.",
    emphasis: "кругові тренування",
    accent: "from-amber-400 to-rose-500",
    extraExercise: "Круговий раунд",
    timed: true,
  },
};

export const WORKOUT_GOAL_ORDER = ["weightLoss", "tone", "muscle", "posture", "endurance"];

export const formatExercisePlan = (exercise, exerciseIndex, config) => {
  const timedExercise =
    /hold|plank|pose|stretch|дих|планк|розтяж/i.test(exercise.name) ||
    /сек|цикл|раунд/i.test(exercise.sets);
  const reps = config.reps + (exerciseIndex % 2 === 0 ? 0 : 2);

  return timedExercise
    ? `${config.sets} підходи x ${config.timerSeconds} сек`
    : `${config.sets} підходи x ${reps}`;
};

export const getGoalExercise = (goal, difficultyConfig) => {
  const rounds = Math.max(2, difficultyConfig.sets);

  return {
    name: goal.extraExercise,
    sets: goal.timed
      ? `${rounds} раунди x ${difficultyConfig.timerSeconds} сек`
      : `${rounds} підходи x ${difficultyConfig.reps + 2}`,
    timer: goal.timed ? `${difficultyConfig.timerSeconds} сек` : "60 сек",
    intensity: goal.emphasis,
    isGoalAccent: true,
  };
};

export const getWorkoutByDifficulty = (workout, difficultyKey, goalKey = "tone") => {
  const config =
    WORKOUT_DIFFICULTY_LEVELS[difficultyKey] || WORKOUT_DIFFICULTY_LEVELS.intermediate;
  const goal = WORKOUT_GOAL_CONFIGS[goalKey] || WORKOUT_GOAL_CONFIGS.tone;
  const exercises = [
    ...workout.exercises.map((exercise, index) => ({
      ...exercise,
      sets: formatExercisePlan(exercise, index, config),
      timer: `${config.timerSeconds} сек`,
      intensity: config.intensity,
    })),
    getGoalExercise(goal, config),
  ];

  return {
    ...workout,
    duration: Math.max(12, Math.round(workout.duration * config.durationMultiplier) + 4),
    difficulty: config,
    goal,
    intensity: config.intensity,
    accent: goal.accent || workout.accent,
    focus: `${workout.focus} Акцент: ${goal.emphasis}.`,
    exercises,
  };
};

export const STORAGE_KEY = "glowup-data";
export const ONBOARDING_KEY = "glowup-onboarding-complete-v2";
export const ONBOARDING_DATA_KEY = "glowup-onboarding-data";

export const ONBOARDING_GOALS = [
  "Схуднути",
  "Набрати м'язи",
  "Підтягнути тіло",
  "Виправити поставу",
];

export const ONBOARDING_ACTIVITIES = [
  { key: "low", label: "Малорухливий", steps: 6000, water: 6 },
  { key: "medium", label: "Середній", steps: 9000, water: 7 },
  { key: "active", label: "Активний", steps: 12000, water: 8 },
  { key: "very-active", label: "Дуже активний", steps: 15000, water: 9 },
];

export const ONBOARDING_WORKOUTS = [
  "Домашні",
  "Зал",
  "Йога/пілатес",
  "Кардіо",
  "Розтяжка",
];

export const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const formatOneDecimal = (value) =>
  Math.round((value + Number.EPSILON) * 10) / 10;

export const getPersonalCaloriesGoal = (profile, currentWeight = 68) => {
  const weight = toNumber(profile.weight, currentWeight) || currentWeight || 68;
  const goal = (profile.goal || "").toLowerCase();
  const base = weight * 30;
  const adjustment = goal.includes("схуд")
    ? -300
    : goal.includes("набрати")
      ? 300
      : goal.includes("підтяг")
        ? -100
        : 0;
  const target = Math.min(Math.max(base + adjustment, 1300), 3400);

  return Math.round(target / 50) * 50;
};

export const buildPersonalPlan = ({
  profile,
  currentWeight,
  calories,
  caloriesGoal,
  steps,
  stepsGoal,
  waterGlasses,
  waterConsumedMl,
  waterGoal,
  habitProgress,
  completedHabits,
  habitsCount,
  selectedMinutes,
}) => {
  const weight = toNumber(profile.weight, currentWeight) || currentWeight;
  const height = toNumber(profile.height);
  const goalWeight = toNumber(profile.goalWeight);
  const age = toNumber(profile.age);
  const goal = profile.goal || "Покращити здоров'я";
  const hasProfileData = weight > 0 && height > 0 && goalWeight > 0;
  const bmi = hasProfileData ? weight / (height / 100) ** 2 : null;
  const bmiRounded = bmi ? formatOneDecimal(bmi) : null;
  const weightGap = hasProfileData ? formatOneDecimal(Math.abs(weight - goalWeight)) : 0;
  const stepsPercent = Math.min(Math.round((steps / stepsGoal) * 100), 100);
  const waterPercent = Math.min(
    Math.round(((waterConsumedMl || waterGlasses * 250) / (waterGoal || 2000)) * 100),
    100
  );
  const caloriesPercent = Math.min(Math.round((calories / caloriesGoal) * 100), 130);
  const ageText = age > 0 ? `, ${age} р.` : "";

  if (!hasProfileData) {
    return {
      hasProfileData: false,
      summary:
        "Заповни зріст, поточну вагу, бажану вагу і ціль. Після цього GlowUp підлаштує калорії, фокус і щоденні поради під тебе.",
      targetText: "Потрібні дані профілю",
      bmiText: "ІМТ з'явиться після заповнення зросту та ваги.",
      workMore: "Найперше варто заповнити профіль, щоб поради були саме для тебе.",
      focusAreas: [
        {
          icon: "👤",
          title: "Профіль",
          text: "Вкажи ім'я, вік, зріст, вагу зараз і бажану вагу.",
        },
        {
          icon: "🎯",
          title: "Ціль",
          text: "Обери, що важливіше зараз: схуднути, підтягнути тіло, набрати м'язи або покращити здоров'я.",
        },
      ],
      nextSteps: [
        "Відкрий профіль і заповни основні дані.",
        "Збережи профіль, щоб Чарлі дав короткий персональний план.",
        "Додай 2-3 свої звички, які реально виконувати щодня.",
      ],
    };
  }

  const bmiText =
    bmiRounded < 18.5
      ? `ІМТ орієнтовно ${bmiRounded}: краще робити акцент на силі, білку і стабільному харчуванні.`
      : bmiRounded < 25
        ? `ІМТ орієнтовно ${bmiRounded}: хороший базовий діапазон, фокусуйся на тонусі, звичках і якості харчування.`
        : bmiRounded < 30
          ? `ІМТ орієнтовно ${bmiRounded}: варто м'яко збільшити рух і тримати помірний контроль калорій.`
          : `ІМТ орієнтовно ${bmiRounded}: рухайся поступово, без різких обмежень, і за можливості порадься з лікарем.`;

  const goalLower = goal.toLowerCase();
  const targetText = goalLower.includes("схуд")
    ? `До бажаної ваги залишилось приблизно ${weightGap} кг. Реалістичний темп: 0.3-0.7 кг на тиждень.`
    : goalLower.includes("набрати")
      ? `Для набору потрібно додати приблизно ${weightGap} кг: силові тренування, білок і невеликий плюс калорій.`
      : goalLower.includes("підтяг")
        ? "Фокус: тонус тіла, регулярні силові вправи, вода і стабільний сон."
        : "Фокус: енергія, сон, вода, рух і звички без перевантаження.";

  const focusAreas = [
    {
      icon: "🔥",
      title: "Калорії",
      text: `Твій персональний орієнтир: близько ${caloriesGoal} ккал на день. Сьогодні вже ${caloriesPercent}% від нього.`,
    },
    {
      icon: "👟",
      title: "Рух",
      text:
        stepsPercent >= 80
          ? "Кроки йдуть добре. Підтримуй темп і додай легку розтяжку ввечері."
          : `Сьогодні виконано ${stepsPercent}% цілі за кроками. Додай 10-15 хв прогулянки.`,
    },
    {
      icon: "💧",
      title: "Вода",
      text:
        waterPercent >= 100
          ? "Вода на сьогодні закрита. Гарна база для енергії."
          : `Випито ${waterConsumedMl || Math.round(waterGlasses * 250)} / ${waterGoal || 2000} мл. Найпростіший плюс зараз: ще 250 мл води.`,
    },
    {
      icon: "✅",
      title: "Звички",
      text:
        habitProgress >= 70
          ? `Виконано ${completedHabits}/${habitsCount} звичок. Тримай ритм, не ускладнюй.`
          : `Виконано ${completedHabits}/${habitsCount} звичок. Вибери одну найважливішу і закрий її першою.`,
    },
  ];

  const weakAreas = [
    { label: "кроками та щоденним рухом", value: 100 - stepsPercent },
    { label: "водою", value: 100 - waterPercent },
    { label: "звичками", value: 100 - habitProgress },
    { label: "харчуванням", value: Math.max(caloriesPercent - 85, 0) },
  ].sort((a, b) => b.value - a.value);

  const nextSteps = [
    `Сьогодні тримай харчування біля ${caloriesGoal} ккал і додай білок у головний прийом їжі.`,
    `Зроби ${selectedMinutes} хв тренування або 15 хв швидкої ходьби, якщо немає сил.`,
    "Увечері відміть звички і коротко запиши, що допомогло не зірватися.",
  ];

  return {
    hasProfileData: true,
    summary: `${profile.name?.trim() || "Твій профіль"}${ageText}: ціль - ${goal}. ${targetText}`,
    targetText,
    bmiText,
    workMore: `Найбільше зараз варто попрацювати над ${weakAreas[0].label}.`,
    focusAreas,
    nextSteps,
  };
};

export const buildBodyAnalysis = ({ gender, goal }) => {
  const genderText =
    gender === "female" ? "жіноче тіло" : gender === "male" ? "чоловіче тіло" : "тіло";
  const goalText = goal || "Покращити здоров'я";
  const goalLower = goalText.toLowerCase();
  const goalRecommendations = goalLower.includes("постав")
    ? [
        "Wall angels - 3 підходи по 10 повторів",
        "Розтяжка грудних м'язів - 2 хвилини",
        "Контроль постави біля стіни - 2 рази на день",
      ]
    : goalLower.includes("набрати")
      ? [
          "Присідання або жим ногами - 3 підходи по 10 повторів",
          "Тяга або горизонтальна тяга - 3 підходи по 12 повторів",
          "Білок у кожному основному прийомі їжі",
        ]
      : goalLower.includes("підтяг")
        ? [
            "Glute bridge - 3 підходи по 15 повторів",
            "Планка - 3 рази по 30 секунд",
            "Повільні присідання - 3 підходи по 12 повторів",
          ]
        : [
            "Швидка ходьба - 20 хвилин",
            "Dead bug - 3 підходи по 12 повторів",
            "Розтяжка згиначів стегна - 2 хвилини",
          ];

  return {
    bodyScore: gender === "male" ? 74 : 72,
    visual: `Аналіз адаптований під ${genderText} і ціль: ${goalText}.`,
    posture:
      "Є можливі ознаки напруження у попереку або плечах. Це не діагноз, а підказка для тренувального фокусу.",
    problems: [
      "Можливий прогин у попереку",
      "Прес і сідниці можуть потребувати більше стабільності",
      "Згиначі стегна можуть бути напружені",
      "Плечі можуть трохи йти вперед після сидіння",
    ],
    recommendations: [
      ...goalRecommendations,
      "Легка розминка перед тренуванням - 5 хвилин",
      "Фото прогресу повторити через 2-4 тижні в тому самому освітленні",
    ],
  };
};

export const getRank = (streak) => {
  if (streak >= 30) return "Майстер дисципліни (30+ дн.)";
  if (streak >= 14) return "Титан волі (14+ дн.)";
  if (streak >= 7) return "Воїн дисципліни (7+ дн.)";
  if (streak >= 3) return "Цілеспрямована людина (3+ дн.)";
  return "Початківець";
};

export const loadDailyMotivation = () => {
  const quotes = readJson("customQuotes", DEFAULT_DAILY_QUOTES);
  let archive = readJson("quoteArchive", []);
  const today = new Date();
  const todayStr = today.toDateString();
  const todayHuman = today.toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "short",
  });
  const savedDate = localStorage.getItem("quoteDate");
  let currentStreak = Number(localStorage.getItem("currentStreak")) || 0;
  let bestStreak = Number(localStorage.getItem("bestStreak")) || 0;
  let dailyQuote = localStorage.getItem("dailyQuote");

  if (savedDate !== todayStr) {
    if (dailyQuote) {
      const oldDate = localStorage.getItem("quoteHumanDate") || todayHuman;
      if (!archive.some((item) => item.quote === dailyQuote)) {
        archive = [{ date: oldDate, quote: dailyQuote }, ...archive];
      }
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    currentStreak = savedDate === yesterday.toDateString() ? currentStreak + 1 : 1;
    bestStreak = Math.max(bestStreak, currentStreak);
    dailyQuote = quotes[Math.floor(Math.random() * quotes.length)] || DEFAULT_DAILY_QUOTES[0];

    localStorage.setItem("quoteDate", todayStr);
    localStorage.setItem("quoteHumanDate", todayHuman);
    localStorage.setItem("dailyQuote", dailyQuote);
    localStorage.setItem("currentStreak", String(currentStreak));
    localStorage.setItem("bestStreak", String(bestStreak));
    localStorage.setItem("quoteArchive", JSON.stringify(archive));
  }

  return { dailyQuote, currentStreak, bestStreak, archive, quotes };
};

export const loadAIDailyMotivation = () => {
  const today = new Date().toDateString();
  const savedDate = localStorage.getItem("glowup-motivation-date");
  const savedMotivation = localStorage.getItem("glowup-motivation-text");

  if (
    savedDate === today &&
    savedMotivation &&
    AI_DAILY_MOTIVATIONS.includes(savedMotivation)
  ) {
    return savedMotivation;
  }

  const random =
    AI_DAILY_MOTIVATIONS[Math.floor(Math.random() * AI_DAILY_MOTIVATIONS.length)];

  localStorage.setItem("glowup-motivation-date", today);
  localStorage.setItem("glowup-motivation-text", random);

  return random;
};

export const buildOnboardingPlan = (data) => {
  const activity =
    ONBOARDING_ACTIVITIES.find((item) => item.key === data.activity) ||
    ONBOARDING_ACTIVITIES[1];
  const weight = toNumber(data.weight, 68);
  const calories = getPersonalCaloriesGoal(
    { goal: data.goal || "Підтягнути тіло", weight },
    weight
  );

  return {
    calories,
    water: activity.water,
    steps: activity.steps,
    training:
      data.trainings?.length > 0
        ? `${data.trainings.slice(0, 2).join(" + ")} • 3-4 рази/тиждень`
        : "Домашні тренування • 3 рази/тиждень",
  };
};

function legacyManualFoodEstimate(text = "") {
  const value = text.toLowerCase();

  if (
    value.includes("яй") ||
    value.includes("омлет") ||
    value.includes("яєчня")
  ) {
    return {
      name: "Яєчня з зеленою цибулею",
      calories: 210,
      protein: 13,
      fat: 16,
      carbs: 2,
      advice:
        "Хороший білковий сніданок. Якщо смажила на олії — калорій може бути трохи більше.",
    };
  }

  if (value.includes("кур") || value.includes("рис")) {
    return {
      name: "Курка з рисом",
      calories: 520,
      protein: 35,
      fat: 12,
      carbs: 65,
      advice: "Добрий варіант після тренування: є білок і вуглеводи.",
    };
  }

  if (value.includes("салат")) {
    return {
      name: "Салат",
      calories: 250,
      protein: 8,
      fat: 12,
      carbs: 20,
      advice: "Легкий варіант. Для ситості можна додати яйце, курку або сир.",
    };
  }

  return {
    name: "Страва не визначена точно",
    calories: 300,
    protein: 10,
    fat: 12,
    carbs: 25,
    advice: "Це приблизна оцінка. Для точності введи назву страви вручну.",
  };
}
