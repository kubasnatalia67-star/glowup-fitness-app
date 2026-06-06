import { useEffect, useMemo, useRef, useState } from "react";
import { CapacitorHttp } from "@capacitor/core";
import { Camera, MediaTypeSelection } from "@capacitor/camera";
import { BarcodeFormat, BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";

import {
  MOTIVATION_THEME_CLASSES,
  APP_THEMES,
  CHARLIE_VOICE_PRESETS,
  DASHBOARD_THEME_STYLES,
  APP_LANGUAGES,
  SPEECH_LANGUAGE_CODES,
  CHARLIE_TEST_PHRASES,
  TRANSLATIONS,
  WORKOUT_CARDS,
  WEEKLY_WORKOUT_SPLIT,
  FOOD_VIDEO_CARDS,
  RECIPE_CARDS,
  readJson,
  getTodayWorkoutIndex,
  getWorkoutWeekKey,
  WORKOUT_DAY_LABELS,
  getLocalDateKey,
  getLastDateKeys,
  clampScore,
  ACHIEVEMENT_DEFINITIONS,
  CHALLENGE_DEFINITIONS,
  getGlowUpLevelInfo,
  getSleepHours,
  getSleepQuality,
  getSleepAdvice,
  getReminderDelay,
  addDaysToDateKey,
  getWorkoutCompletedDates,
  getWorkoutStreakCount,
  WORKOUT_DIFFICULTY_LEVELS,
  WORKOUT_DIFFICULTY_ORDER,
  WORKOUT_GOAL_CONFIGS,
  WORKOUT_GOAL_ORDER,
  getWorkoutByDifficulty,
  STORAGE_KEY,
  ONBOARDING_KEY,
  ONBOARDING_DATA_KEY,
  ONBOARDING_GOALS,
  ONBOARDING_ACTIVITIES,
  ONBOARDING_WORKOUTS,
  toNumber,
  formatOneDecimal,
  getPersonalCaloriesGoal,
  buildPersonalPlan,
  buildBodyAnalysis,
  getRank,
  loadDailyMotivation,
  loadAIDailyMotivation,
  buildOnboardingPlan
} from "./data/glowupData.js";
import AIFoodScanResult from "./components/AIFoodScanResult.jsx";
import AchievementsSection from "./components/AchievementsSection.jsx";
import ChallengesSection from "./components/ChallengesSection.jsx";
import GlowUpLevelCard from "./components/GlowUpLevelCard.jsx";
import LatestAchievementCard from "./components/LatestAchievementCard.jsx";
import SleepTrackerCard from "./components/SleepTrackerCard.jsx";
import WaterTrackerCard from "./components/WaterTrackerCard.jsx";
import { analyzeFoodImage } from "./services/foodScanService.js";
import { analyzeBodyImage } from "./services/bodyAnalysisService.js";
import {
  getAppNotificationPermission,
  hasNativeLocalNotifications,
  isCapacitorAndroid,
  requestAppNotificationPermission,
  scheduleNativeAiCoachReminder,
  scheduleNativeSleepReminder,
  scheduleNativeWaterReminders,
  scheduleNativeWakeAlarm,
  showAppNotification,
} from "./services/notificationService.js";
import {
  getNativeTtsAvailability,
  hasNativeTts,
  speakNativeText,
  stopNativeSpeech,
} from "./services/ttsService.js";
import {
  compressCanvasToDataUrl,
  compressImageFile,
  keepLocalPhoto,
  stripLargePhotosFromDiary,
} from "./utils/imageUtils.js";
import { askCharlie } from "./services/charlieService.js";
import {
  API_BASE_URL_STORAGE_KEY,
  getConfiguredApiBaseUrl,
  normalizeApiBaseUrl,
} from "./services/apiConfigService.js";
import {
  getAndroidStepsStatus,
  getAndroidTodaySteps,
  hasNativeStepCounter,
  resetAndroidStepsBaseline,
} from "./services/stepsService.js";
import {
  getGlowUpWidgetStats,
  getGlowUpWidgetStatus,
  hasNativeWidget,
  requestPinGlowUpWidget,
  updateGlowUpWidget,
} from "./services/widgetService.js";
import exerciseSpriteSheet from "./assets/exercises/exercise-sprite-sheet.png";

const FOOD_BARCODE_FORMATS = [
  BarcodeFormat.Ean8,
  BarcodeFormat.Ean13,
  BarcodeFormat.UpcA,
  BarcodeFormat.UpcE,
];

const DEFAULT_CYCLE_TRACKER = {
  lastPeriodStart: "",
  periodLength: 5,
  cycleLength: 28,
  mood: "",
  painLevel: 0,
  symptoms: [],
  note: "",
};

const CYCLE_MOOD_OPTIONS = [
  { value: "", label: "Обери настрій" },
  { value: "good", label: "Добрий" },
  { value: "calm", label: "Спокійний" },
  { value: "sensitive", label: "Чутливий" },
  { value: "irritable", label: "Дратівливий" },
  { value: "low", label: "Пригнічений" },
];

const CYCLE_SYMPTOM_OPTIONS = [
  { value: "cramps", label: "Спазми" },
  { value: "headache", label: "Головний біль" },
  { value: "bloating", label: "Здуття" },
  { value: "fatigue", label: "Втома" },
  { value: "backPain", label: "Біль у спині" },
  { value: "cravings", label: "Тяга до солодкого" },
];

const dateKeyToDate = (dateKey) => new Date(`${dateKey}T00:00:00`);

const getDateKeyDiffDays = (fromDateKey, toDateKey) => {
  const fromDate = dateKeyToDate(fromDateKey);
  const toDate = dateKeyToDate(toDateKey);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return 0;

  return Math.round((toDate.getTime() - fromDate.getTime()) / 86400000);
};

const formatCycleDate = (dateKey) =>
  dateKey
    ? dateKeyToDate(dateKey).toLocaleDateString("uk-UA", { day: "2-digit", month: "short" })
    : "-";

const isDemoProfile = (profile = {}) => {
  const name = String(profile.name || "").trim();
  const normalizedName = name.toLowerCase();

  return (
    normalizedName === "анастасія" ||
    normalizedName === "анастасия" ||
    normalizedName.includes("анастас") ||
    normalizedName.includes("рђрЅр°сѓ") ||
    normalizedName.includes("рђрѕр°сѓ") ||
    name === "РђРЅР°СЃС‚Р°СЃС–СЏ"
  );
};

const emptyUserProfile = {
  name: "",
  gender: "",
  age: "",
  height: "",
  startWeight: "",
  weight: "",
  goalWeight: "",
  goal: "",
};

const WORKOUT_EXERCISE_ILLUSTRATIONS = {
  "legs-glutes-1": ["squat", "bridge", "lunge", "hinge", "spark"],
  "arms-triceps": ["pushup", "dip", "armRaise", "plank", "spark"],
  "back-posture": ["superman", "birdDog", "row", "wallAngel", "spark"],
  "cardio-abs": ["jumpingJack", "mountainClimber", "deadBug", "plank", "spark"],
  "glutes-legs-2": ["bridge", "lunge", "sideLeg", "calfRaise", "spark"],
  "upper-body": ["pushup", "plank", "snowAngel", "plank", "spark"],
  "recovery-stretch": ["catCow", "stretch", "childPose", "breath", "spark"],
};

const getExerciseIllustrationType = (exercise, workout, index) => {
  const name = String(exercise?.name || "").toLowerCase();

  if (exercise?.isGoalAccent) return "spark";
  if (/squat/.test(name)) return "squat";
  if (/bridge|thrust/.test(name)) return "bridge";
  if (/lunge|split/.test(name)) return "lunge";
  if (/push|віджим|РІС–РґР¶РёРј/.test(name)) return "pushup";
  if (/dip|triceps/.test(name)) return "dip";
  if (/plank|планк|РїР»Р°РЅРє/.test(name)) return "plank";
  if (/jump|cardio/.test(name)) return "jumpingJack";
  if (/mountain/.test(name)) return "mountainClimber";
  if (/bug/.test(name)) return "deadBug";
  if (/superman/.test(name)) return "superman";
  if (/bird/.test(name)) return "birdDog";
  if (/wall/.test(name)) return "wallAngel";
  if (/snow/.test(name)) return "snowAngel";
  if (/cat|cow/.test(name)) return "catCow";
  if (/stretch/.test(name)) return "stretch";
  if (/child/.test(name)) return "childPose";
  if (/breath|дих|РґРёС…/.test(name)) return "breath";
  if (/calf/.test(name)) return "calfRaise";
  if (/side leg/.test(name)) return "sideLeg";
  if (/raise/.test(name)) return "armRaise";
  if (/row|towel/.test(name)) return "row";
  if (/romanian|deadlift|hinge/.test(name)) return "hinge";

  return WORKOUT_EXERCISE_ILLUSTRATIONS[workout?.id]?.[index] || "spark";
};

const EXERCISE_DEMO_META = {
  squat: { label: "Присід", cue: "Сядь назад, коліна м'яко вперед, спина рівна.", motion: "вниз-вгору" },
  bridge: { label: "Місток", cue: "Піднімай таз, стискай сідниці у верхній точці.", motion: "таз вгору" },
  lunge: { label: "Випад", cue: "Крок назад, корпус рівно, коліно не завалюється.", motion: "крок" },
  hinge: { label: "Тяга", cue: "Відведи таз назад, спина довга, рух від стегон.", motion: "нахил" },
  pushup: { label: "Віджим", cue: "Корпус однією лінією, груди до опори.", motion: "вниз-вгору" },
  dip: { label: "Трицепс", cue: "Лікті назад, плечі вниз, рух контрольований.", motion: "лікті" },
  armRaise: { label: "Руки", cue: "Піднімай руки без ривка, шия розслаблена.", motion: "підйом" },
  plank: { label: "Планка", cue: "Живіт підтягнутий, таз не провалюється.", motion: "тримай" },
  superman: { label: "Superman", cue: "Підніми груди й ноги, не закидай голову.", motion: "утримуй" },
  birdDog: { label: "Bird dog", cue: "Рука і протилежна нога тягнуться, таз рівний.", motion: "баланс" },
  row: { label: "Тяга", cue: "Лопатки назад і вниз, лікті йдуть до ребер.", motion: "тягни" },
  wallAngel: { label: "Постава", cue: "Спина біля стіни, руки ковзають повільно.", motion: "вгору" },
  jumpingJack: { label: "Кардіо", cue: "М'яке приземлення, коліна розслаблені.", motion: "ритм" },
  mountainClimber: { label: "Climber", cue: "Планка міцна, коліна рухаються по черзі.", motion: "швидко" },
  deadBug: { label: "Dead bug", cue: "Поперек притиснутий, рухай руку й протилежну ногу.", motion: "контроль" },
  sideLeg: { label: "Нога", cue: "Лежачи на боці, піднімай ногу без маху.", motion: "підйом" },
  calfRaise: { label: "Ікри", cue: "Підіймайся на носки і повільно опускайся.", motion: "носок" },
  snowAngel: { label: "Спина", cue: "Лопатки працюють, руки малюють дугу.", motion: "дуга" },
  catCow: { label: "Мобільність", cue: "Округли спину, потім м'яко прогнись.", motion: "хвиля" },
  stretch: { label: "Розтяжка", cue: "Дихай спокійно, не тягни через біль.", motion: "видих" },
  childPose: { label: "Відпочинок", cue: "Сядь назад, витягни руки і розслаб плечі.", motion: "дихай" },
  breath: { label: "Дихання", cue: "Вдих на 4, видих на 6, плечі спокійні.", motion: "4-6" },
  spark: { label: "Комбо", cue: "Виконуй повільно і відмічай кожен раунд.", motion: "фокус" },
};

const getExerciseDemoMeta = (type) => EXERCISE_DEMO_META[type] || EXERCISE_DEMO_META.spark;

const getExerciseDurationSeconds = (exercise, fallbackSeconds = 45) => {
  const values = `${exercise?.timer || ""} ${exercise?.sets || ""}`.match(/\d+/g);
  const parsed = values?.map(Number).find((value) => Number.isFinite(value) && value >= 10);

  return parsed || fallbackSeconds;
};

const getVideoWorkoutMinutes = (workout, fallbackMinutes = 25) => {
  const [minutes, seconds] = String(workout?.time || "")
    .split(":")
    .map((value) => Number(value));

  if (!Number.isFinite(minutes)) return fallbackMinutes;

  return Math.max(1, minutes + (Number(seconds) > 0 ? 1 : 0));
};

const EXERCISE_DEMO_VISUALS = {
  squat: { icon: "🏋️‍♀️", label: "присід", motion: "↕" },
  bridge: { icon: "🧘‍♀️", label: "місток", motion: "↥" },
  lunge: { icon: "🤸‍♀️", label: "випад", motion: "↘" },
  hinge: { icon: "🏋️‍♀️", label: "тяга", motion: "↙" },
  pushup: { icon: "💪", label: "віджим", motion: "↕" },
  dip: { icon: "💪", label: "трицепс", motion: "↧" },
  armRaise: { icon: "🙆‍♀️", label: "руки", motion: "↥" },
  plank: { icon: "🧘‍♀️", label: "планка", motion: "━" },
  superman: { icon: "🤸‍♀️", label: "superman", motion: "⇡" },
  birdDog: { icon: "🧘‍♀️", label: "баланс", motion: "⇄" },
  row: { icon: "🚣‍♀️", label: "тяга", motion: "⇠" },
  wallAngel: { icon: "🙆‍♀️", label: "постава", motion: "↥" },
  jumpingJack: { icon: "🏃‍♀️", label: "стрибок", motion: "↔" },
  mountainClimber: { icon: "🏃‍♀️", label: "climber", motion: "⇄" },
  deadBug: { icon: "🧘‍♀️", label: "кор", motion: "⇄" },
  sideLeg: { icon: "🤸‍♀️", label: "нога", motion: "↥" },
  calfRaise: { icon: "🦵", label: "ікри", motion: "↥" },
  snowAngel: { icon: "🙆‍♀️", label: "спина", motion: "⌒" },
  catCow: { icon: "🧘‍♀️", label: "йога", motion: "∿" },
  stretch: { icon: "🧘‍♀️", label: "стретч", motion: "↘" },
  childPose: { icon: "🧘‍♀️", label: "релакс", motion: "…" },
  breath: { icon: "🫁", label: "дихання", motion: "4-6" },
  spark: { icon: "✨", label: "комбо", motion: "★" },
};

function LegacyExerciseIllustration({ type, checked }) {
  const meta = getExerciseDemoMeta(type);
  const visual = EXERCISE_DEMO_VISUALS[type] || EXERCISE_DEMO_VISUALS.spark;
  const stroke = checked ? "#ffffff" : "#fde68a";
  const accent = checked ? "#f9a8d4" : "#67e8f9";
  const common = {
    fill: "none",
    stroke,
    strokeWidth: 4,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  const drawings = {
    squat: (
      <>
        <circle cx="34" cy="16" r="6" fill={accent} />
        <path {...common} d="M32 23 L25 38 L38 38 L47 51" />
        <path {...common} d="M25 38 L16 51" />
        <path {...common} d="M30 28 L48 31" />
      </>
    ),
    bridge: (
      <>
        <circle cx="17" cy="38" r="5" fill={accent} />
        <path {...common} d="M22 38 C31 20 45 20 54 38" />
        <path {...common} d="M23 38 L10 48" />
        <path {...common} d="M54 38 L59 49" />
      </>
    ),
    lunge: (
      <>
        <circle cx="34" cy="15" r="6" fill={accent} />
        <path {...common} d="M33 23 L29 38 L18 51" />
        <path {...common} d="M29 38 L49 39 L58 51" />
        <path {...common} d="M31 29 L47 23" />
      </>
    ),
    hinge: (
      <>
        <circle cx="25" cy="17" r="6" fill={accent} />
        <path {...common} d="M28 24 L45 35 L36 51" />
        <path {...common} d="M45 35 L56 49" />
        <path {...common} d="M40 35 L20 42" />
      </>
    ),
    pushup: (
      <>
        <circle cx="16" cy="31" r="5" fill={accent} />
        <path {...common} d="M22 31 L48 39 L59 39" />
        <path {...common} d="M28 33 L25 49" />
        <path {...common} d="M45 38 L41 51" />
      </>
    ),
    dip: (
      <>
        <circle cx="35" cy="15" r="6" fill={accent} />
        <path {...common} d="M35 23 L35 38 L24 48" />
        <path {...common} d="M36 37 L50 48" />
        <path {...common} d="M25 28 L49 28" />
      </>
    ),
    armRaise: (
      <>
        <circle cx="34" cy="17" r="6" fill={accent} />
        <path {...common} d="M34 24 L34 43" />
        <path {...common} d="M33 29 L17 17" />
        <path {...common} d="M35 29 L51 17" />
        <path {...common} d="M34 43 L24 55" />
        <path {...common} d="M34 43 L45 55" />
      </>
    ),
    plank: (
      <>
        <circle cx="17" cy="28" r="5" fill={accent} />
        <path {...common} d="M23 29 L50 35 L60 35" />
        <path {...common} d="M27 30 L24 45" />
        <path {...common} d="M47 34 L50 49" />
      </>
    ),
    superman: (
      <>
        <circle cx="18" cy="31" r="5" fill={accent} />
        <path {...common} d="M24 32 L41 34" />
        <path {...common} d="M37 34 L58 24" />
        <path {...common} d="M39 35 L58 47" />
      </>
    ),
    birdDog: (
      <>
        <circle cx="23" cy="22" r="5" fill={accent} />
        <path {...common} d="M28 25 L42 36" />
        <path {...common} d="M33 29 L16 43" />
        <path {...common} d="M42 36 L60 27" />
        <path {...common} d="M42 36 L34 53" />
      </>
    ),
    row: (
      <>
        <circle cx="23" cy="20" r="6" fill={accent} />
        <path {...common} d="M27 27 L40 40 L33 54" />
        <path {...common} d="M40 40 L53 51" />
        <path {...common} d="M35 34 L54 28" />
      </>
    ),
    wallAngel: (
      <>
        <circle cx="34" cy="14" r="6" fill={accent} />
        <path {...common} d="M34 22 L34 47" />
        <path {...common} d="M18 26 L34 31 L50 26" />
        <path {...common} d="M18 14 L18 54" stroke={accent} />
      </>
    ),
    jumpingJack: (
      <>
        <circle cx="34" cy="15" r="6" fill={accent} />
        <path {...common} d="M34 23 L34 39" />
        <path {...common} d="M32 27 L15 13" />
        <path {...common} d="M36 27 L53 13" />
        <path {...common} d="M34 39 L19 55" />
        <path {...common} d="M34 39 L49 55" />
      </>
    ),
    mountainClimber: (
      <>
        <circle cx="16" cy="27" r="5" fill={accent} />
        <path {...common} d="M22 28 L45 33 L58 29" />
        <path {...common} d="M34 31 L25 48" />
        <path {...common} d="M45 33 L55 51" />
      </>
    ),
    deadBug: (
      <>
        <circle cx="34" cy="36" r="5" fill={accent} />
        <path {...common} d="M34 31 L34 49" />
        <path {...common} d="M30 38 L15 24" />
        <path {...common} d="M38 38 L53 24" />
        <path {...common} d="M31 48 L20 57" />
        <path {...common} d="M37 48 L49 57" />
      </>
    ),
    sideLeg: (
      <>
        <circle cx="18" cy="38" r="5" fill={accent} />
        <path {...common} d="M23 38 L46 39" />
        <path {...common} d="M42 39 L58 29" />
        <path {...common} d="M42 40 L58 50" />
      </>
    ),
    calfRaise: (
      <>
        <circle cx="34" cy="15" r="6" fill={accent} />
        <path {...common} d="M34 23 L34 43" />
        <path {...common} d="M34 43 L25 58" />
        <path {...common} d="M34 43 L46 58" />
        <path {...common} d="M24 58 L19 58" />
        <path {...common} d="M46 58 L54 55" />
      </>
    ),
    snowAngel: (
      <>
        <circle cx="34" cy="18" r="6" fill={accent} />
        <path {...common} d="M34 25 L34 46" />
        <path {...common} d="M18 35 C23 26 27 23 34 25 C41 23 46 26 51 35" />
        <path {...common} d="M34 46 L21 56" />
        <path {...common} d="M34 46 L47 56" />
      </>
    ),
    catCow: (
      <>
        <circle cx="18" cy="30" r="5" fill={accent} />
        <path {...common} d="M24 32 C34 22 44 22 55 33" />
        <path {...common} d="M30 34 L25 49" />
        <path {...common} d="M49 34 L54 49" />
      </>
    ),
    stretch: (
      <>
        <circle cx="33" cy="16" r="6" fill={accent} />
        <path {...common} d="M33 23 L30 42 L17 55" />
        <path {...common} d="M30 42 L53 49" />
        <path {...common} d="M31 29 L50 22" />
      </>
    ),
    childPose: (
      <>
        <circle cx="22" cy="39" r="5" fill={accent} />
        <path {...common} d="M27 39 C34 30 45 30 53 39" />
        <path {...common} d="M29 42 L15 51" />
        <path {...common} d="M42 39 L58 51" />
      </>
    ),
    breath: (
      <>
        <circle cx="25" cy="34" r="8" fill={accent} opacity="0.9" />
        <path {...common} d="M38 28 C50 21 58 29 51 38" />
        <path {...common} d="M39 42 C52 49 59 39 52 33" />
        <path {...common} d="M24 48 L24 55" />
      </>
    ),
    spark: (
      <>
        <path {...common} d="M34 10 L38 28 L56 32 L39 38 L34 56 L29 38 L12 32 L30 28 Z" />
        <circle cx="34" cy="32" r="5" fill={accent} />
      </>
    ),
  };

  return (
    <span
      className={`relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl border transition ${
        checked
          ? "border-pink-300/50 bg-gradient-to-br from-pink-500 to-orange-400"
          : "border-white/10 bg-gradient-to-br from-[#10162f] via-[#15122d] to-[#281747]"
      }`}
      aria-hidden="true"
    >
      <span className="absolute inset-x-3 bottom-3 h-3 rounded-full bg-gradient-to-r from-cyan-300/35 via-pink-300/35 to-orange-300/35 blur-[1px]" />
      <span className="absolute left-2 top-2 rounded-full bg-black/25 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white/75">
        {visual.label}
      </span>
      <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/12 text-sm font-black text-cyan-100">
        {visual.motion}
      </span>
      <span className="absolute left-3 right-3 top-10 h-10 rounded-full border border-white/10 bg-white/5" />
      <span className="absolute left-4 top-12 text-sm text-cyan-200/75">‹</span>
      <span className="absolute right-4 top-12 text-sm text-pink-200/75">›</span>
      <span
        className={`relative z-10 grid h-16 w-16 place-items-center rounded-full bg-white/10 text-4xl shadow-[0_0_22px_rgba(236,72,153,0.28)] ${
          checked ? "scale-105" : "animate-bounce"
        }`}
        style={{ animationDuration: "1.8s" }}
      >
        {visual.icon}
      </span>
      <span className="absolute bottom-1.5 left-2 right-2 truncate rounded-full bg-black/25 px-2 py-0.5 text-center text-[9px] font-bold text-white/80">
        {meta.motion}
      </span>
    </span>
  );
}

const EXERCISE_SVG_DEMOS = {
  squat: { label: "присідання", frames: ["stand", "squat", "stand"], arrow: "down" },
  bridge: { label: "місток", frames: ["bridgeLow", "bridgeHigh", "bridgeLow"], arrow: "up" },
  lunge: { label: "випади", frames: ["stand", "lunge", "stand"], arrow: "forward" },
  hinge: { label: "тяга", frames: ["stand", "hinge", "stand"], arrow: "down" },
  pushup: { label: "віджимання", frames: ["plank", "pushupLow", "plank"], arrow: "down" },
  dip: { label: "трицепс", frames: ["dipHigh", "dipLow", "dipHigh"], arrow: "down" },
  armRaise: { label: "руки", frames: ["armsLow", "armsHigh", "armsLow"], arrow: "up" },
  plank: { label: "планка", frames: ["plank", "plank", "plank"], arrow: "hold" },
  superman: { label: "superman", frames: ["supermanLow", "supermanHigh", "supermanLow"], arrow: "up" },
  birdDog: { label: "bird dog", frames: ["birdDogLeft", "birdDogRight", "birdDogLeft"], arrow: "switch" },
  row: { label: "тяга", frames: ["hingeReach", "rowPull", "hingeReach"], arrow: "pull" },
  wallAngel: { label: "постава", frames: ["armsLow", "armsHigh", "armsLow"], arrow: "up" },
  jumpingJack: { label: "кардіо", frames: ["stand", "jackOpen", "stand"], arrow: "open" },
  mountainClimber: { label: "climber", frames: ["climberLeft", "climberRight", "climberLeft"], arrow: "switch" },
  deadBug: { label: "кор", frames: ["deadBugLeft", "deadBugRight", "deadBugLeft"], arrow: "switch" },
  sideLeg: { label: "нога", frames: ["sideLegLow", "sideLegHigh", "sideLegLow"], arrow: "up" },
  calfRaise: { label: "ікри", frames: ["stand", "calfRaise", "stand"], arrow: "up" },
  snowAngel: { label: "спина", frames: ["armsLow", "armsHigh", "armsLow"], arrow: "open" },
  catCow: { label: "йога", frames: ["catPose", "cowPose", "catPose"], arrow: "wave" },
  stretch: { label: "стретч", frames: ["stand", "stretchPose", "stand"], arrow: "forward" },
  childPose: { label: "відпочинок", frames: ["childPose", "childPose", "childPose"], arrow: "hold" },
  breath: { label: "дихання", frames: ["breathSmall", "breathBig", "breathSmall"], arrow: "breath" },
  spark: { label: "комбо", frames: ["stand", "jackOpen", "squat"], arrow: "switch" },
};

const EXERCISE_IMAGE_DEMOS = {
  squat: { label: "присідання", cell: 0, motion: "squat" },
  plank: { label: "планка", cell: 1, motion: "plank" },
  pushup: { label: "віджимання", cell: 2, motion: "pushup" },
  lunge: { label: "випади", cell: 3, motion: "lunge" },
  bridge: { label: "місток", cell: 4, motion: "bridge" },
  mountainClimber: { label: "climber", cell: 5, motion: "climber" },
  deadBug: { label: "кор", cell: 6, motion: "core" },
  birdDog: { label: "bird dog", cell: 7, motion: "balance" },
  jumpingJack: { label: "кардіо", cell: 8, motion: "jump" },
  catCow: { label: "йога", cell: 9, motion: "breath" },
  childPose: { label: "йога", cell: 9, motion: "breath" },
  stretch: { label: "стретч", cell: 10, motion: "stretch" },
  row: { label: "тяга", cell: 11, motion: "row" },
  hinge: { label: "тяга", cell: 11, motion: "hinge" },
  wallAngel: { label: "постава", cell: 12, motion: "arms" },
  armRaise: { label: "руки", cell: 12, motion: "arms" },
  snowAngel: { label: "спина", cell: 12, motion: "arms" },
  calfRaise: { label: "ікри", cell: 13, motion: "calf" },
  breath: { label: "дихання", cell: 14, motion: "breath" },
  dip: { label: "трицепс", cell: 15, motion: "jump" },
  sideLeg: { label: "нога", cell: 3, motion: "lunge" },
  superman: { label: "superman", cell: 7, motion: "balance" },
  spark: { label: "комбо", cell: 15, motion: "jump" },
};

const getExerciseImagePosition = (cell = 15) => {
  const col = cell % 4;
  const row = Math.floor(cell / 4);

  return `${col * 33.3333}% ${row * 33.3333}%`;
};

const EXERCISE_POSES = {
  stand: { head: [50, 19], torso: "M50 28 L50 52", arms: "M50 34 L38 45 M50 34 L62 45", legs: "M50 52 L40 78 M50 52 L60 78" },
  squat: { head: [50, 25], torso: "M50 34 L45 54", arms: "M48 39 L30 46 M49 39 L67 45", legs: "M45 54 L31 66 L24 82 M45 54 L61 65 L70 82" },
  lunge: { head: [48, 20], torso: "M48 29 L44 52", arms: "M46 36 L30 47 M47 36 L64 31", legs: "M44 52 L28 66 L21 82 M44 52 L67 55 L78 75" },
  hinge: { head: [42, 21], torso: "M45 29 L65 47", arms: "M58 43 L77 56 M56 42 L74 51", legs: "M65 47 L54 79 M65 47 L78 78" },
  bridgeLow: { head: [27, 62], torso: "M33 62 C44 52 58 52 70 62", arms: "M31 65 L20 77 M67 63 L78 77", legs: "M40 62 L29 78 M68 62 L78 78" },
  bridgeHigh: { head: [26, 62], torso: "M32 62 C44 33 62 33 72 62", arms: "M31 65 L20 77 M70 63 L81 77", legs: "M40 61 L30 78 M69 62 L80 78" },
  plank: { head: [25, 45], torso: "M31 47 L67 55", arms: "M38 49 L34 76 M62 54 L66 76", legs: "M67 55 L84 69 M67 55 L86 56" },
  pushupLow: { head: [25, 54], torso: "M31 55 L67 62", arms: "M40 57 L37 78 M62 61 L64 79", legs: "M67 62 L85 73 M67 62 L86 63" },
  dipHigh: { head: [50, 21], torso: "M50 30 L50 54", arms: "M46 38 L31 44 M54 38 L69 44", legs: "M50 54 L37 77 M50 54 L65 77" },
  dipLow: { head: [50, 31], torso: "M50 40 L50 58", arms: "M45 47 L31 43 M55 47 L69 43", legs: "M50 58 L36 77 M50 58 L66 77" },
  armsLow: { head: [50, 20], torso: "M50 29 L50 54", arms: "M49 36 L33 46 M51 36 L67 46", legs: "M50 54 L39 78 M50 54 L61 78" },
  armsHigh: { head: [50, 20], torso: "M50 29 L50 54", arms: "M48 35 L30 18 M52 35 L70 18", legs: "M50 54 L39 78 M50 54 L61 78" },
  jackOpen: { head: [50, 20], torso: "M50 29 L50 51", arms: "M48 34 L24 17 M52 34 L76 17", legs: "M50 51 L27 78 M50 51 L73 78" },
  climberLeft: { head: [24, 43], torso: "M31 46 L67 51", arms: "M39 47 L33 76 M62 50 L67 76", legs: "M67 51 L81 75 M58 51 L45 73" },
  climberRight: { head: [24, 43], torso: "M31 46 L67 51", arms: "M39 47 L33 76 M62 50 L67 76", legs: "M67 51 L52 73 M58 51 L83 75" },
  deadBugLeft: { head: [50, 50], torso: "M50 56 L50 70", arms: "M49 58 L31 39 M52 58 L70 47", legs: "M48 69 L34 82 M52 69 L65 83" },
  deadBugRight: { head: [50, 50], torso: "M50 56 L50 70", arms: "M49 58 L32 47 M52 58 L69 38", legs: "M48 69 L35 83 M52 69 L67 77" },
  supermanLow: { head: [29, 54], torso: "M35 55 L61 56", arms: "M42 55 L23 63 M50 56 L72 64", legs: "M60 56 L81 63 M60 56 L80 52" },
  supermanHigh: { head: [29, 49], torso: "M35 51 L61 51", arms: "M42 51 L20 35 M50 51 L76 38", legs: "M60 51 L83 38 M60 51 L82 65" },
  birdDogLeft: { head: [33, 35], torso: "M39 39 L60 52", arms: "M44 42 L20 56 M58 51 L73 73", legs: "M60 52 L83 39 M60 52 L48 78" },
  birdDogRight: { head: [33, 35], torso: "M39 39 L60 52", arms: "M44 42 L22 28 M58 51 L73 73", legs: "M60 52 L82 69 M60 52 L42 77" },
  hingeReach: { head: [40, 23], torso: "M43 31 L64 47", arms: "M57 43 L80 50 M56 44 L78 58", legs: "M64 47 L54 79 M64 47 L78 78" },
  rowPull: { head: [41, 23], torso: "M44 31 L64 47", arms: "M56 43 L75 36 M57 44 L78 44", legs: "M64 47 L54 79 M64 47 L78 78" },
  sideLegLow: { head: [29, 61], torso: "M35 61 L65 62", arms: "M40 62 L26 78 M61 62 L72 78", legs: "M64 62 L82 73 M64 62 L82 61" },
  sideLegHigh: { head: [29, 61], torso: "M35 61 L65 62", arms: "M40 62 L26 78 M61 62 L72 78", legs: "M64 62 L85 43 M64 62 L82 73" },
  calfRaise: { head: [50, 18], torso: "M50 27 L50 51", arms: "M50 34 L36 43 M50 34 L64 43", legs: "M50 51 L40 76 M50 51 L62 76" },
  catPose: { head: [24, 48], torso: "M31 50 C43 33 59 33 72 50", arms: "M38 50 L33 77 M66 50 L72 77", legs: "M44 50 L43 77 M61 50 L60 77" },
  cowPose: { head: [24, 43], torso: "M31 46 C43 58 59 58 72 47", arms: "M38 48 L33 77 M66 49 L72 77", legs: "M44 50 L43 77 M61 50 L60 77" },
  stretchPose: { head: [43, 22], torso: "M45 30 L41 54", arms: "M44 38 L72 33 M45 38 L68 43", legs: "M41 54 L25 78 M41 54 L71 73" },
  childPose: { head: [31, 62], torso: "M36 63 C49 50 66 52 77 66", arms: "M39 65 L20 76 M64 61 L86 73", legs: "M61 62 L48 80 M71 66 L80 80" },
  breathSmall: { head: [50, 32], torso: "M50 42 L50 68", arms: "M50 49 C39 45 38 58 49 60 M50 49 C61 45 62 58 51 60", legs: "M50 68 L39 82 M50 68 L61 82" },
  breathBig: { head: [50, 31], torso: "M50 41 L50 68", arms: "M50 49 C30 35 23 58 46 62 M50 49 C70 35 77 58 54 62", legs: "M50 68 L39 82 M50 68 L61 82" },
};

function ExercisePose({ pose, begin = "0s" }) {
  const body = EXERCISE_POSES[pose] || EXERCISE_POSES.stand;

  return (
    <g>
      <animate attributeName="opacity" values="0.16;1;0.16" dur="2.4s" begin={begin} repeatCount="indefinite" />
      <path d={body.torso} className="stroke-fuchsia-400/25" strokeWidth="20" />
      <path d={body.arms} className="stroke-fuchsia-400/25" strokeWidth="15" />
      <path d={body.legs} className="stroke-fuchsia-400/25" strokeWidth="16" />
      <path d={body.torso} className="stroke-[#f8c7ff]" strokeWidth="14" />
      <path d={body.arms} className="stroke-[#f2a8ff]" strokeWidth="10" />
      <path d={body.legs} className="stroke-[#f2a8ff]" strokeWidth="11" />
      <circle cx={body.head[0]} cy={body.head[1]} r="10" fill="#f7b7ff" />
      <circle cx={body.head[0] - 3} cy={body.head[1] - 3} r="3" fill="#fff2ff" opacity="0.85" />
    </g>
  );
}

function ExerciseIllustration({ type, checked }) {
  const meta = getExerciseDemoMeta(type);
  const visual = EXERCISE_IMAGE_DEMOS[type] || EXERCISE_IMAGE_DEMOS.spark;

  return (
    <span
      className={`relative grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-2xl border transition ${
        checked
          ? "border-pink-200/60 bg-gradient-to-br from-pink-500 to-orange-400"
          : "border-fuchsia-300/15 bg-gradient-to-br from-[#080b18] via-[#141026] to-[#211139]"
      }`}
      aria-hidden="true"
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(236,72,153,0.32),transparent_48%)]" />
      <span className="absolute inset-x-4 bottom-4 h-4 rounded-full bg-fuchsia-300/25 blur-md" />
      <span className="absolute left-2 top-2 rounded-full bg-fuchsia-400/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-fuchsia-100">
        рух
      </span>
      <span
        className={`exercise-demo-person exercise-motion-${visual.motion || "breath"} absolute inset-2 rounded-[18px] bg-cover bg-no-repeat shadow-[0_0_24px_rgba(236,72,153,0.34)]`}
        style={{
          backgroundImage: `url(${exerciseSpriteSheet})`,
          backgroundPosition: getExerciseImagePosition(visual.cell),
          backgroundSize: "400% 400%",
        }}
      />
      <span className="absolute inset-2 rounded-[18px] bg-gradient-to-t from-[#060818]/55 via-transparent to-transparent" />
      <span className="absolute bottom-2 left-2 right-2 truncate rounded-full bg-white/10 px-2 py-1 text-center text-[9px] font-black text-white/85">
        {visual.label || meta.label}
      </span>
    </span>
  );
}

const MANUAL_FOOD_PORTIONS = [
  {
    keywords: ["банан", "banana"],
    label: "1 банан ≈ 120 г",
    grams: 120,
    unit: "г",
    per100: { calories: 89, protein: 1.1, fat: 0.3, carbs: 23 },
  },
  {
    keywords: ["яблуко", "ябл", "apple"],
    label: "1 яблуко ≈ 180 г",
    grams: 180,
    unit: "г",
    per100: { calories: 52, protein: 0.3, fat: 0.2, carbs: 14 },
  },
  {
    keywords: ["яйце", "яй", "egg"],
    label: "1 яйце ≈ 50 г",
    grams: 50,
    unit: "г",
    per100: { calories: 155, protein: 13, fat: 11, carbs: 1.1 },
  },
  {
    keywords: ["лате", "latte"],
    label: "1 чашка лате ≈ 250 мл",
    grams: 250,
    unit: "мл",
    per100: { calories: 64, protein: 3.3, fat: 3.4, carbs: 4.8 },
  },
  {
    keywords: ["рис", "rice"],
    label: "1 порція рису ≈ 150 г",
    grams: 150,
    unit: "г",
    per100: { calories: 130, protein: 2.7, fat: 0.3, carbs: 28 },
  },
  {
    keywords: ["хліб", "хлеб", "bread"],
    label: "1 шматок хліба ≈ 30 г",
    grams: 30,
    unit: "г",
    per100: { calories: 265, protein: 9, fat: 3.2, carbs: 49 },
  },
  {
    keywords: ["куряче філе", "кур", "chicken"],
    label: "1 куряче філе ≈ 150 г",
    grams: 150,
    unit: "г",
    per100: { calories: 165, protein: 31, fat: 3.6, carbs: 0 },
  },
];

const findManualFoodPortion = (name) => {
  const value = name.trim().toLowerCase();
  if (!value) return null;
  return MANUAL_FOOD_PORTIONS.find((item) =>
    item.keywords.some((keyword) => value.includes(keyword))
  ) || null;
};

const calculateManualFoodMacros = (portion, amount) => {
  if (!portion) return null;
  const ratio = Math.max(0, Number(amount) || portion.grams) / 100;
  return {
    calories: Math.round(portion.per100.calories * ratio),
    protein: formatOneDecimal(portion.per100.protein * ratio),
    fat: formatOneDecimal(portion.per100.fat * ratio),
    carbs: formatOneDecimal(portion.per100.carbs * ratio),
  };
};

const toPositiveNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

const getLocalizedOpenFoodFactsValue = (product, field, language = "uk") => {
  const languageCode = String(language || "uk").toLowerCase().split("-")[0];
  return (
    product?.[`${field}_${languageCode}`] ||
    product?.[field] ||
    product?.[`${field}_uk`] ||
    product?.[`${field}_en`] ||
    ""
  );
};

const getOpenFoodFactsBarcodeCandidates = (barcode) => {
  const value = String(barcode || "").replace(/\D/g, "");
  const candidates = [value];

  if (value.length === 12) candidates.push(`0${value}`);
  if (value.length === 13 && value.startsWith("0")) candidates.push(value.slice(1));
  if (value.length === 8) candidates.push(value.padStart(13, "0"));

  return [...new Set(candidates)].filter((item) => item.length >= 6 && item.length <= 14);
};

const normalizeOpenFoodFactsProduct = (barcode, product, language = "uk") => {
  const nutriments = product?.nutriments || {};
  const name =
    getLocalizedOpenFoodFactsValue(product, "product_name", language) ||
    getLocalizedOpenFoodFactsValue(product, "generic_name", language) ||
    `Barcode ${barcode}`;

  return {
    barcode,
    name,
    brand: product?.brands || product?.brands_tags?.join(", ") || "",
    photo: product?.image_front_url || product?.image_url || product?.selected_images?.front?.display?.en || "",
    calories100g: toPositiveNumber(nutriments["energy-kcal_100g"] || nutriments["energy-kcal"], 0),
    protein100g: toPositiveNumber(nutriments.proteins_100g, 0),
    fat100g: toPositiveNumber(nutriments.fat_100g, 0),
    carbs100g: toPositiveNumber(nutriments.carbohydrates_100g, 0),
    ingredients:
      getLocalizedOpenFoodFactsValue(product, "ingredients_text", language) ||
      "",
    nutriScore: product?.nutriscore_grade || product?.nutriscore_2023_tags?.[0] || "",
    servingGrams: toPositiveNumber(product?.serving_quantity, 0),
    packageGrams: toPositiveNumber(product?.product_quantity, 0),
    categories: `${product?.categories || ""} ${product?.categories_tags?.join(" ") || ""}`,
    quantity: product?.quantity || "",
    sourceUrl: `https://world.openfoodfacts.org/product/${barcode}`,
  };
};

const isChocolateProduct = (product) =>
  `${product?.name || ""} ${product?.categories || ""}`.toLowerCase().includes("chocolate") ||
  `${product?.name || ""} ${product?.categories || ""}`.toLowerCase().includes("chocolat") ||
  `${product?.name || ""} ${product?.categories || ""}`.toLowerCase().includes("шокол");

const getBarcodePortionOptions = (product) => {
  if (!product) return [];

  const servingGrams = product.servingGrams || 30;
  const packageGrams = product.packageGrams || (isChocolateProduct(product) ? 95 : 100);
  const baseOptions = [
    { id: "piece", label: "1 шматочок", grams: isChocolateProduct(product) ? 10 : 30 },
  ];

  if (isChocolateProduct(product)) {
    baseOptions.push({ id: "row", label: "1 рядок / пластинка", grams: 25 });
  }

  return [
    ...baseOptions,
    { id: "package", label: "1 плитка / упаковка", grams: packageGrams },
    { id: "serving", label: "1 порція", grams: servingGrams },
    { id: "custom", label: "custom grams", grams: 0 },
  ];
};

const calculateBarcodeMacros = (product, grams) => {
  if (!product || !grams) return null;
  const ratio = Math.max(0, Number(grams) || 0) / 100;
  return {
    calories: Math.round(product.calories100g * ratio),
    protein: formatOneDecimal(product.protein100g * ratio),
    fat: formatOneDecimal(product.fat100g * ratio),
    carbs: formatOneDecimal(product.carbs100g * ratio),
  };
};

const MEASUREMENT_FIELDS = [
  ["waist", "Талія"],
  ["hips", "Стегна"],
  ["chest", "Груди"],
  ["arm", "Рука"],
  ["leg", "Нога"],
];

export default function FitnessHabitsApp() {
  const videoRef = useRef(null);
  const cameraFallbackInputRef = useRef(null);
  const manualFoodFormRef = useRef(null);
  const charlieDragRef = useRef(null);
  const recognitionRef = useRef(null);
  const homeTopRef = useRef(null);
  const waterSectionRef = useRef(null);
  const sleepSectionRef = useRef(null);
  const habitsSectionRef = useRef(null);
  const cycleSectionRef = useRef(null);
  const savedGlowUpDataRef = useRef(readJson(STORAGE_KEY, {}));
  const savedGlowUpData = savedGlowUpDataRef.current;
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraTarget, setCameraTarget] = useState(null);
  const [cameraFallbackTarget, setCameraFallbackTarget] = useState("food");
  const [charliePosition, setCharliePosition] = useState(() => ({
    x: typeof window !== "undefined" ? Math.max(window.innerWidth - 76, 18) : 18,
    y: 92,
  }));
  const [isCharlieOpen, setIsCharlieOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [widgetStatsReady, setWidgetStatsReady] = useState(() => !hasNativeWidget());
  const [widgetStatus, setWidgetStatus] = useState(null);
  const [widgetMessage, setWidgetMessage] = useState("");
  const [xpState, setXpState] = useState(() =>
    readJson("glowupXpState", { totalXp: 0, awarded: {} })
  );
  const [unlockedBadges, setUnlockedBadges] = useState(() =>
    readJson("glowupBadges", {})
  );
  const [challengeState, setChallengeState] = useState(() =>
    readJson("glowupChallenges", {})
  );
  const [levelUpMessage, setLevelUpMessage] = useState("");
  const [achievementMessage, setAchievementMessage] = useState("");
  const [challengeMessage, setChallengeMessage] = useState("");
  const [appTheme, setAppTheme] = useState(
    () => localStorage.getItem("appTheme") || "glow"
  );
  const [appLanguage, setAppLanguage] = useState(
    () => localStorage.getItem("appLanguage") || "uk"
  );
  const [apiBaseUrl, setApiBaseUrl] = useState(() => getConfiguredApiBaseUrl());
  const [apiBaseUrlMessage, setApiBaseUrlMessage] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(
    () => localStorage.getItem("voiceEnabled") !== "false"
  );
  const [voicePreset, setVoicePreset] = useState(
    () => localStorage.getItem("voicePreset") || "coach"
  );
  const [voiceRate, setVoiceRate] = useState(
    () => Number(localStorage.getItem("voiceRate")) || CHARLIE_VOICE_PRESETS.coach.rate
  );
  const [voicePitch, setVoicePitch] = useState(
    () => Number(localStorage.getItem("voicePitch")) || CHARLIE_VOICE_PRESETS.coach.pitch
  );
  const [voiceMessage, setVoiceMessage] = useState("");
  const [measurements, setMeasurements] = useState(() => readJson("bodyMeasurements", []));
  const [measurementMetric, setMeasurementMetric] = useState("waist");
  const [measurementForm, setMeasurementForm] = useState({
    waist: "",
    hips: "",
    chest: "",
    arm: "",
    leg: "",
  });
  const [isListening, setIsListening] = useState(false);
  const [motivationData, setMotivationData] = useState(loadDailyMotivation);
  const [dailyMotivation, setDailyMotivation] = useState(loadAIDailyMotivation);
  const [motivationTheme, setMotivationTheme] = useState(
    () => localStorage.getItem("userTheme") || "light"
  );
  const [newMotivationQuote, setNewMotivationQuote] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () =>
      localStorage.getItem("notificationsEnabled") === "true" &&
      (hasNativeLocalNotifications() ||
        ("Notification" in window && Notification.permission === "granted"))
  );
  const [notificationPermission, setNotificationPermission] = useState(() =>
    hasNativeLocalNotifications()
      ? "default"
      : "Notification" in window
        ? Notification.permission
        : "unsupported"
  );
  const [settingsToggles, setSettingsToggles] = useState(() => ({
    camera: false,
    notifications: localStorage.getItem("notificationsEnabled") === "true",
    aiCoach: localStorage.getItem("setting-aiCoach") !== "false",
    waterReminder: localStorage.getItem("setting-waterReminder") === "true",
    sleepReminder: localStorage.getItem("setting-sleepReminder") === "true",
    workoutReminder: localStorage.getItem("setting-workoutReminder") === "true",
    photoAccess: localStorage.getItem("setting-photoAccess") === "true",
    darkTheme: localStorage.getItem("appTheme") === "night",
    sound: localStorage.getItem("voiceEnabled") !== "false",
    vibration: localStorage.getItem("setting-vibration") === "true",
  }));

  const [beforePhoto, setBeforePhoto] = useState(
    () => savedGlowUpData.beforePhoto || ""
  );
  const [afterPhoto, setAfterPhoto] = useState(
    () => savedGlowUpData.afterPhoto || ""
  );
  const [foodPhoto, setFoodPhoto] = useState(
    () => savedGlowUpData.foodPhoto || ""
  );
  const [foodName, setFoodName] = useState(
    () => savedGlowUpData.foodName || ""
  );
  const [foodResult, setFoodResult] = useState(
    () => savedGlowUpData.foodResult || null
  );
  const [foodAnalysisLoading, setFoodAnalysisLoading] = useState(false);
  const [foodAnalysisError, setFoodAnalysisError] = useState("");
  const [foodDiary, setFoodDiary] = useState(() => readJson("foodDiary", []));
  const [manualFood, setManualFood] = useState({
    name: "",
    meal: "сніданок",
    amount: "",
    barcode: "",
    calories: "",
    protein: "",
    fat: "",
    carbs: "",
  });
  const [barcodeNotice, setBarcodeNotice] = useState("");
  const [isBarcodeScanning, setIsBarcodeScanning] = useState(false);
  const [barcodeLookupLoading, setBarcodeLookupLoading] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [barcodeProductError, setBarcodeProductError] = useState("");
  const [barcodePortionId, setBarcodePortionId] = useState("piece");
  const [barcodePortionCount, setBarcodePortionCount] = useState(1);
  const [barcodeCustomGrams, setBarcodeCustomGrams] = useState("");
  const manualFoodPortion = useMemo(
    () => findManualFoodPortion(manualFood.name),
    [manualFood.name]
  );
  const manualFoodEstimate = useMemo(
    () => calculateManualFoodMacros(manualFoodPortion, manualFood.amount),
    [manualFoodPortion, manualFood.amount]
  );
  const barcodePortionOptions = useMemo(
    () => getBarcodePortionOptions(barcodeProduct),
    [barcodeProduct]
  );
  const selectedBarcodePortion = useMemo(
    () => barcodePortionOptions.find((option) => option.id === barcodePortionId) || barcodePortionOptions[0],
    [barcodePortionId, barcodePortionOptions]
  );
  const barcodeGrams = useMemo(() => {
    if (!selectedBarcodePortion) return 0;
    if (selectedBarcodePortion.id === "custom") {
      return Math.max(0, Number(barcodeCustomGrams) || 0);
    }
    return Math.max(0, Number(barcodePortionCount) || 1) * selectedBarcodePortion.grams;
  }, [barcodeCustomGrams, barcodePortionCount, selectedBarcodePortion]);
  const barcodeNutritionEstimate = useMemo(
    () => calculateBarcodeMacros(barcodeProduct, barcodeGrams),
    [barcodeProduct, barcodeGrams]
  );
  const [nutritionGoals, setNutritionGoals] = useState(() =>
    readJson("nutritionGoals", {
      calories: "",
      protein: 140,
      fat: 60,
      carbs: 200,
    })
  );
  const [showNutritionGoalsEditor, setShowNutritionGoalsEditor] = useState(false);
  const [bodyPhoto, setBodyPhoto] = useState("");
  const [bodyAnalysis, setBodyAnalysis] = useState(null);
  const [bodyAnalysisLoading, setBodyAnalysisLoading] = useState(false);
  const [bodyAnalysisError, setBodyAnalysisError] = useState("");
  const [selectedWorkoutIndex, setSelectedWorkoutIndex] = useState(0);
  const [selectedSplitIndex, setSelectedSplitIndex] = useState(getTodayWorkoutIndex);
  const [weeklyWorkoutLog, setWeeklyWorkoutLog] = useState(() =>
    readJson("weeklyWorkoutLog", {})
  );
  const [workoutDifficulty, setWorkoutDifficulty] = useState(
    () => localStorage.getItem("workoutDifficulty") || "intermediate"
  );
  const [workoutGoal, setWorkoutGoal] = useState(
    () => localStorage.getItem("workoutGoal") || "tone"
  );
  const [workoutStreakAnimation, setWorkoutStreakAnimation] = useState(false);
  const [workoutPlanNotice, setWorkoutPlanNotice] = useState("");
  const [selectedFoodVideoIndex, setSelectedFoodVideoIndex] = useState(0);
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(0);
  const [openedWorkout, setOpenedWorkout] = useState(null);
  const [openedDish, setOpenedDish] = useState(null);
  const [dashboardTab, setDashboardTab] = useState("home");
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [progressChartType, setProgressChartType] = useState("steps");
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState(() => {
    const savedProfile = readJson("userProfile", emptyUserProfile);
    const cleanProfile = isDemoProfile(savedProfile) ? emptyUserProfile : savedProfile;

    return {
      ...cleanProfile,
      gender: cleanProfile.gender || savedGlowUpData.gender || "",
      weight: String(savedGlowUpData.weight || cleanProfile.weight || ""),
    };
  });
  const [onboardingComplete, setOnboardingComplete] = useState(
    () =>
      localStorage.getItem(ONBOARDING_KEY) === "true" &&
      Boolean(readJson("userProfile", null)?.name?.trim()) &&
      !isDemoProfile(readJson("userProfile", null))
  );
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState(() =>
    readJson(ONBOARDING_DATA_KEY, {
      goal: profile.goal || "",
      gender: profile.gender || "",
      name: profile.name || "",
      weight: profile.weight || "",
      height: profile.height || "",
      age: profile.age || "",
      activity: "",
      trainings: [],
      bodyPhoto: "",
    })
  );

  const [habits, setHabits] = useState(() =>
    readJson("userHabits", [
      { title: "Пити воду", done: false },
      { title: "Тренування", done: false },
    ])
  );
  const [newHabit, setNewHabit] = useState("");
  const [habitDailyLog, setHabitDailyLog] = useState(() =>
    readJson("habitDailyLog", {})
  );
  const [cycleTracker, setCycleTracker] = useState(() => ({
    ...DEFAULT_CYCLE_TRACKER,
    ...readJson("cycleTracker", {}),
  }));
  const [cycleHistory, setCycleHistory] = useState(() =>
    readJson("cycleHistory", [])
  );
  const [cycleMessage, setCycleMessage] = useState("");

  const [weightInput, setWeightInput] = useState("");
  const [currentWeight, setCurrentWeight] = useState(
    () => Number(savedGlowUpData.weight) || Number(profile.weight) || 0
  );

  const [waterGlasses, setWaterGlasses] = useState(() =>
    Number.isFinite(Number(savedGlowUpData.water))
      ? Number(savedGlowUpData.water)
      : 5
  );
  const [waterDailyLog, setWaterDailyLog] = useState(() =>
    readJson("waterDailyLog", {})
  );
  const [waterGoalMl, setWaterGoalMl] = useState(
    () => Number(localStorage.getItem("waterGoalMl")) || 2000
  );
  const [waterReminderInterval, setWaterReminderInterval] = useState(
    () => localStorage.getItem("waterReminderInterval") || "2"
  );
  const [sleepDailyLog, setSleepDailyLog] = useState(() =>
    readJson("sleepDailyLog", {})
  );
  const [sleepAlarmMessage, setSleepAlarmMessage] = useState("");
  const [sleepGoalHours, setSleepGoalHours] = useState(
    () => Number(localStorage.getItem("sleepGoalHours")) || 8
  );
  const [bedtimeReminderTime, setBedtimeReminderTime] = useState(
    () => localStorage.getItem("bedtimeReminderTime") || "22:30"
  );
  const [steps, setSteps] = useState(
    () => Number(readJson("stepsDailyLog", {})[getLocalDateKey()]) || 0
  );
  const [stepsDailyLog, setStepsDailyLog] = useState(() =>
    readJson("stepsDailyLog", {})
  );
  const [stepsSourceMessage, setStepsSourceMessage] = useState("");
  const [stepsSensorStatus, setStepsSensorStatus] = useState(null);
  const [calories, setCalories] = useState(1450);
  const [activeWorkout, setActiveWorkout] = useState(() =>
    readJson("activeWorkout", null)
  );
  const [workoutHistory, setWorkoutHistory] = useState(() =>
    readJson("workoutHistory", [])
  );

  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState(
    "Привіт! Я Чарлі. Запитай мене про тренування, харчування, мотивацію, спокій або заробіток."
  );
  const [charlieMessages, setCharlieMessages] = useState([
    {
      role: "assistant",
      text: "Привіт! Я Чарлі. Запитай мене про тренування, харчування, мотивацію, спокій або заробіток.",
    },
  ]);
  const [isCharlieThinking, setIsCharlieThinking] = useState(false);

  const [selectedMinutes, setSelectedMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const totalXp = Number(xpState.totalXp) || 0;
  const xpAwarded = xpState.awarded || {};
  const glowUpLevel = getGlowUpLevelInfo(totalXp);
  const goalWeight = Number(profile.goalWeight) || 55;
  const startWeight = Number(profile.startWeight) || Number(profile.weight) || currentWeight || 68;
  const stepsGoal = 20000;
  const todayWaterKey = getLocalDateKey();
  const hasTodayWaterLog = Object.prototype.hasOwnProperty.call(waterDailyLog, todayWaterKey);
  const waterConsumedMl = hasTodayWaterLog ? Number(waterDailyLog[todayWaterKey]) || 0 : 0;
  const waterGoal = Number(waterGoalMl) || 2000;
  const waterGlassesToday = formatOneDecimal(waterConsumedMl / 250);
  const waterRemainingMl = Math.max(waterGoal - waterConsumedMl, 0);
  const waterProgress = Math.min(Math.round((waterConsumedMl / waterGoal) * 100), 100);
  const todaySleepKey = getLocalDateKey();
  const todayStepsKey = getLocalDateKey();
  const todaySleepEntry = sleepDailyLog[todaySleepKey] || {};
  const sleepBedTime = todaySleepEntry.bedTime || "";
  const sleepWakeTime = todaySleepEntry.wakeTime || "";
  const sleepMood = todaySleepEntry.mood || "";
  const sleepNote = todaySleepEntry.note || "";
  const sleepGoal = Number(sleepGoalHours) || 8;
  const sleepHours = getSleepHours(sleepBedTime, sleepWakeTime);
  const sleepProgress = Math.min(Math.round((sleepHours / sleepGoal) * 100), 100);
  const sleepQuality = getSleepQuality(sleepHours, sleepGoal);
  const sleepAdvice = getSleepAdvice(sleepHours, sleepGoal);
  const caloriesGoal = getPersonalCaloriesGoal(profile, currentWeight);
  const showApiSettings =
    import.meta.env.DEV || localStorage.getItem("glowupShowApiSettings") === "true";
  const dailyNutritionGoals = {
    calories: Number(nutritionGoals.calories) || caloriesGoal,
    protein: Number(nutritionGoals.protein) || 140,
    fat: Number(nutritionGoals.fat) || 60,
    carbs: Number(nutritionGoals.carbs) || 200,
  };
  const todayDiaryEntries = foodDiary.filter((item) => item.date === getLocalDateKey());
  const todayDiaryCalories = todayDiaryEntries.reduce(
    (sum, item) => sum + (Number(item.calories) || 0),
    0
  );
  const todayDiaryProtein = todayDiaryEntries.reduce(
    (sum, item) => sum + (Number(item.protein) || 0),
    0
  );
  const todayDiaryFat = todayDiaryEntries.reduce(
    (sum, item) => sum + (Number(item.fat) || 0),
    0
  );
  const todayDiaryCarbs = todayDiaryEntries.reduce(
    (sum, item) => sum + (Number(item.carbs) || 0),
    0
  );
  const caloriesTodayTotal = todayDiaryCalories;
  const activeCalories = Math.round((Number(steps) || 0) * 0.04);
  const dailyCaloriesGoal = dailyNutritionGoals.calories;
  const remainingCalories = dailyCaloriesGoal - caloriesTodayTotal + activeCalories;
  const nutritionProgress = {
    calories: Math.min(Math.round((caloriesTodayTotal / dailyNutritionGoals.calories) * 100), 130),
    protein: Math.min(Math.round((todayDiaryProtein / dailyNutritionGoals.protein) * 100), 130),
    fat: Math.min(Math.round((todayDiaryFat / dailyNutritionGoals.fat) * 100), 130),
    carbs: Math.min(Math.round((todayDiaryCarbs / dailyNutritionGoals.carbs) * 100), 130),
  };
  const nutritionLeft = {
    calories: Math.max(dailyNutritionGoals.calories - caloriesTodayTotal, 0),
    protein: Math.max(dailyNutritionGoals.protein - todayDiaryProtein, 0),
    fat: Math.max(dailyNutritionGoals.fat - todayDiaryFat, 0),
    carbs: Math.max(dailyNutritionGoals.carbs - todayDiaryCarbs, 0),
  };
  const latestMeasurement = measurements[0] || null;
  const measurementChartData = useMemo(() => {
    const entries = [...measurements]
      .reverse()
      .slice(-8)
      .map((entry) => ({
        id: entry.id,
        date: entry.date,
        value: Number(entry[measurementMetric]) || 0,
      }))
      .filter((entry) => entry.value > 0);

    if (entries.length === 0) {
      return {
        points: "",
        entries: [],
        first: 0,
        latest: 0,
        delta: 0,
        min: 0,
        max: 0,
      };
    }

    const values = entries.map((entry) => entry.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);

    const points = entries
      .map((entry, index) => {
        const x = entries.length === 1 ? 50 : (index / (entries.length - 1)) * 100;
        const y = 88 - ((entry.value - min) / span) * 68;
        return `${x},${y}`;
      })
      .join(" ");

    return {
      points,
      entries,
      first: entries[0].value,
      latest: entries[entries.length - 1].value,
      delta: formatOneDecimal(entries[entries.length - 1].value - entries[0].value),
      min,
      max,
    };
  }, [measurementMetric, measurements]);
  const selectedMeasurementLabel =
    MEASUREMENT_FIELDS.find(([key]) => key === measurementMetric)?.[1] || "Заміри";
  const measurementSummary = useMemo(() => {
    const chronological = [...measurements].reverse();

    return MEASUREMENT_FIELDS.map(([key, label]) => {
      const values = chronological
        .map((entry) => ({
          date: entry.date,
          value: Number(entry[key]) || 0,
        }))
        .filter((entry) => entry.value > 0);

      if (values.length === 0) {
        return {
          key,
          label,
          first: 0,
          latest: 0,
          delta: 0,
          date: "",
          trend: "empty",
        };
      }

      const first = values[0].value;
      const latest = values[values.length - 1].value;
      const delta = formatOneDecimal(latest - first);

      return {
        key,
        label,
        first,
        latest,
        delta,
        date: values[values.length - 1].date,
        trend: delta < 0 ? "down" : delta > 0 ? "up" : "same",
      };
    });
  }, [measurements]);
  const latestAiFoodScan =
    foodDiary.find((item) => item.source === "openai") || null;
  const nutritionAiAdvice = useMemo(() => {
    const goalText = String(profile.goal || "").toLowerCase();
    const diarySummary = todayDiaryEntries
      .map((item) => `${item.meal || item.source || "їжа"}: ${item.name}`)
      .join(", ");
    const proteinRatio = todayDiaryProtein / dailyNutritionGoals.protein;
    const caloriesRatio = caloriesTodayTotal / dailyNutritionGoals.calories;
    const fatRatio = todayDiaryFat / dailyNutritionGoals.fat;
    const carbsRatio = todayDiaryCarbs / dailyNutritionGoals.carbs;

    let calorieStatus = "Калорії в нормі.";
    if (caloriesRatio >= 1.05) {
      calorieStatus = "Калорії вже трохи перебрані, наступний прийом краще зробити легким.";
    } else if (caloriesRatio < 0.65) {
      calorieStatus = "Ще є запас калорій на повноцінний прийом їжі.";
    }

    let proteinStatus = "Білка достатньо для цього етапу дня.";
    if (proteinRatio < 0.55) {
      proteinStatus = "Білка поки не вистачає.";
    } else if (proteinRatio >= 1) {
      proteinStatus = "Білкова ціль уже майже закрита.";
    }

    const missing = [];
    if (proteinRatio < 0.75) missing.push("білка");
    if (carbsRatio < 0.55 && caloriesRatio < 0.95) missing.push("складних вуглеводів");
    if (fatRatio < 0.45 && caloriesRatio < 0.95) missing.push("корисних жирів");

    let nextMeal = "Обери легку тарілку: білок + овочі + трохи складних вуглеводів.";
    if (goalText.includes("схуд")) {
      nextMeal = proteinRatio < 0.75
        ? "Далі краще з’їсти нежирний білок: курку, яйця, рибу, сир або йогурт плюс овочі."
        : "Далі тримай легкий прийом: овочі, суп або салат без зайвої олії.";
    } else if (goalText.includes("наб")) {
      nextMeal = "Далі підійде ситний прийом: білок + крупа або картопля + овочі.";
    } else if (goalText.includes("постав")) {
      nextMeal = "Для постави й відновлення додай білок, магнійні продукти та воду: риба, яйця, зелень, гречка.";
    } else if (goalText.includes("витрив")) {
      nextMeal = "Для витривалості додай повільні вуглеводи й білок: рис, вівсянка, гречка, курка або йогурт.";
    }

    if (caloriesRatio >= 1.05) {
      nextMeal = "На сьогодні краще обрати щось дуже легке: овочі, вода, чай, або білок без жирних соусів.";
    }

    return {
      source: "local",
      title: todayDiaryEntries.length > 0 ? "Порада на основі сьогоднішнього щоденника" : "Порада після першого запису стане точнішою",
      calorieStatus,
      proteinStatus,
      missing: missing.length ? `Не вистачає: ${missing.join(", ")}.` : "Основні макроси виглядають збалансовано.",
      nextMeal,
      summary: `З’їдено ${caloriesTodayTotal}/${dailyNutritionGoals.calories} ккал. Залишилось ${nutritionLeft.calories} ккал.`,
      apiPayload: {
        caloriesEaten: caloriesTodayTotal,
        caloriesLeft: nutritionLeft.calories,
        macros: {
          protein: todayDiaryProtein,
          fat: todayDiaryFat,
          carbs: todayDiaryCarbs,
        },
        goals: dailyNutritionGoals,
        userGoal: profile.goal || "",
        todayFoodDiary: diarySummary,
      },
    };
  }, [
    profile.goal,
    todayDiaryEntries,
    todayDiaryProtein,
    todayDiaryFat,
    todayDiaryCarbs,
    caloriesTodayTotal,
    dailyNutritionGoals,
    nutritionLeft.calories,
  ]);
  const targetLoss = 10;
  const lostWeight = 7.2;

  const completedHabits = habits.filter((habit) => habit.done).length;
  const completedHabitTitles = habits
    .filter((habit) => habit.done)
    .map((habit) => habit.title);
  const habitProgress = habits.length
    ? Math.round((completedHabits / habits.length) * 100)
    : 0;
  const progressChartSeries = useMemo(() => {
    const dates = getLastDateKeys(7);
    const labels = dates.map((dateKey) =>
      new Date(`${dateKey}T00:00:00`).toLocaleDateString("uk-UA", { weekday: "short" })
    );
    const todayKey = getLocalDateKey();

    return {
      labels,
      steps: dates.map((dateKey) =>
        dateKey === todayKey ? Number(steps) || 0 : Number(stepsDailyLog[dateKey]) || 0
      ),
      calories: dates.map((dateKey) =>
        foodDiary
          .filter((item) => item.date === dateKey)
          .reduce((sum, item) => sum + (Number(item.calories) || 0), 0)
      ),
      water: dates.map((dateKey) =>
        dateKey === todayKey ? Number(waterConsumedMl) || 0 : Number(waterDailyLog[dateKey]) || 0
      ),
      habits: dates.map((dateKey) => {
        const completedForDate = dateKey === todayKey ? completedHabitTitles : habitDailyLog[dateKey];

        return Array.isArray(completedForDate)
          ? completedForDate.length
          : Number(completedForDate) || 0;
      }),
    };
  }, [
    completedHabits,
    completedHabitTitles,
    foodDiary,
    habitDailyLog,
    steps,
    stepsDailyLog,
    waterConsumedMl,
    waterDailyLog,
  ]);

  const habitLast7Days = progressChartSeries.habits.map((value) => Number(value) || 0);
  const habitAverage7Days = formatOneDecimal(
    habitLast7Days.reduce((sum, value) => sum + value, 0) / Math.max(habitLast7Days.length, 1)
  );
  const habitPerfectDays7Days =
    habits.length > 0 ? habitLast7Days.filter((value) => value >= habits.length).length : 0;
  const habitBest7Days = Math.max(...habitLast7Days, 0);
  const habitStreakDays = (() => {
    if (!habits.length) return 0;

    let streak = 0;

    for (let offset = 0; offset < 30; offset += 1) {
      const dateKey = addDaysToDateKey(getLocalDateKey(), -offset);
      const completedForDate = offset === 0 ? completedHabitTitles : habitDailyLog[dateKey];
      const completedCount = Array.isArray(completedForDate)
        ? completedForDate.length
        : Number(completedForDate) || 0;

      if (completedCount < habits.length) break;
      streak += 1;
    }

    return streak;
  })();
  const mostMissedHabit = (() => {
    if (!habits.length) return null;

    const dates = getLastDateKeys(7);
    const missed = habits.map((habit) => {
      const missedDays = dates.filter((dateKey) => {
        const completedForDate =
          dateKey === getLocalDateKey() ? completedHabitTitles : habitDailyLog[dateKey];

        return !Array.isArray(completedForDate) || !completedForDate.includes(habit.title);
      }).length;

      return { title: habit.title, missedDays };
    });

    return missed.sort((a, b) => b.missedDays - a.missedDays)[0];
  })();
  const stepsProgress = Math.min(Math.round((steps / stepsGoal) * 100), 100);
  const stepStrideMeters = Math.max(0.5, Math.min(0.9, (Number(profile.height) || 165) * 0.00414));
  const stepsDistanceKm = formatOneDecimal(((Number(steps) || 0) * stepStrideMeters) / 1000);
  const stepsLast7Days = progressChartSeries.steps.map((value) => Number(value) || 0);
  const stepsAverage7Days = Math.round(
    stepsLast7Days.reduce((sum, value) => sum + value, 0) / Math.max(stepsLast7Days.length, 1)
  );
  const stepsBest7Days = Math.max(...stepsLast7Days, 0);
  const stepsAverageDistanceKm = formatOneDecimal((stepsAverage7Days * stepStrideMeters) / 1000);
  const stepsGoalDays7Days = stepsLast7Days.filter((value) => value >= stepsGoal).length;
  const stepsChartMax = Math.max(stepsGoal, stepsBest7Days, 1);
  const cycleInfo = useMemo(() => {
    const lastPeriodStart = cycleTracker.lastPeriodStart;
    const cycleLength = Math.max(21, Math.min(45, Number(cycleTracker.cycleLength) || 28));
    const periodLength = Math.max(2, Math.min(10, Number(cycleTracker.periodLength) || 5));

    if (!lastPeriodStart) {
      return {
        ready: false,
        cycleLength,
        periodLength,
        day: 0,
        phase: "Додай дату",
        nextPeriodStart: "",
        nextPeriodEnd: "",
        ovulationDate: "",
        fertileStart: "",
        fertileEnd: "",
        daysToNext: null,
        progress: 0,
      };
    }

    const todayKey = getLocalDateKey();
    const daysSinceStart = Math.max(0, getDateKeyDiffDays(lastPeriodStart, todayKey));
    const cycleIndex = Math.floor(daysSinceStart / cycleLength);
    const currentCycleStart = addDaysToDateKey(lastPeriodStart, cycleIndex * cycleLength);
    const nextPeriodStart = addDaysToDateKey(currentCycleStart, cycleLength);
    const nextPeriodEnd = addDaysToDateKey(nextPeriodStart, periodLength - 1);
    const ovulationDate = addDaysToDateKey(nextPeriodStart, -14);
    const fertileStart = addDaysToDateKey(ovulationDate, -5);
    const fertileEnd = addDaysToDateKey(ovulationDate, 1);
    const day = (daysSinceStart % cycleLength) + 1;
    const daysToNext = Math.max(0, getDateKeyDiffDays(todayKey, nextPeriodStart));
    const isPeriod = day <= periodLength;
    const isFertile = todayKey >= fertileStart && todayKey <= fertileEnd;
    const isOvulation = todayKey === ovulationDate;
    const phase = isPeriod
      ? "Менструація"
      : isOvulation
        ? "Овуляція"
        : isFertile
          ? "Фертильне вікно"
          : daysToNext <= 5
            ? "Перед місячними"
            : "Звичайний день";

    return {
      ready: true,
      cycleLength,
      periodLength,
      day,
      phase,
      nextPeriodStart,
      nextPeriodEnd,
      ovulationDate,
      fertileStart,
      fertileEnd,
      daysToNext,
      progress: Math.min(100, Math.round((day / cycleLength) * 100)),
    };
  }, [cycleTracker]);
  const cycleStats = useMemo(() => {
    const entries = cycleHistory
      .filter((entry) => entry?.lastPeriodStart)
      .sort((a, b) => a.lastPeriodStart.localeCompare(b.lastPeriodStart));
    const recordedCycleLengths = entries
      .map((entry) => Number(entry.cycleLength))
      .filter((value) => value >= 21 && value <= 45);
    const actualCycleLengths = entries
      .slice(1)
      .map((entry, index) =>
        getDateKeyDiffDays(entries[index].lastPeriodStart, entry.lastPeriodStart)
      )
      .filter((value) => value >= 15 && value <= 60);
    const cycleLengths = actualCycleLengths.length ? actualCycleLengths : recordedCycleLengths;
    const periodLengths = entries
      .map((entry) => Number(entry.periodLength))
      .filter((value) => value >= 2 && value <= 10);
    const painLevels = entries
      .map((entry) => Number(entry.painLevel))
      .filter((value) => value > 0);
    const symptomCounts = entries.reduce((counts, entry) => {
      (Array.isArray(entry.symptoms) ? entry.symptoms : []).forEach((symptom) => {
        counts[symptom] = (counts[symptom] || 0) + 1;
      });
      return counts;
    }, {});
    const topSymptoms = Object.entries(symptomCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([value, count]) => ({
        value,
        count,
        label: CYCLE_SYMPTOM_OPTIONS.find((option) => option.value === value)?.label || value,
      }));
    const average = (values) =>
      values.length
        ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
        : 0;

    return {
      entriesCount: entries.length,
      averageCycleLength: average(cycleLengths),
      averagePeriodLength: average(periodLengths),
      averagePain: average(painLevels),
      topSymptoms,
    };
  }, [cycleHistory]);
  const caloriesProgress = Math.min(
    Math.round((caloriesTodayTotal / dailyNutritionGoals.calories) * 100),
    100
  );
  const calorieBalance = Math.max(
    0,
    Math.round(100 - (Math.abs(caloriesTodayTotal - dailyNutritionGoals.calories) / dailyNutritionGoals.calories) * 100)
  );
  const dailyProgress = Math.min(
    Math.round((stepsProgress + waterProgress + habitProgress + calorieBalance) / 4),
    100
  );
  const weightProgressBase = Math.abs(startWeight - goalWeight);
  const weightProgressRaw =
    weightProgressBase === 0
      ? 100
      : goalWeight < startWeight
        ? ((startWeight - currentWeight) / (startWeight - goalWeight)) * 100
        : ((currentWeight - startWeight) / (goalWeight - startWeight)) * 100;
  const weightGoalProgress = Math.min(
    100,
    Math.max(0, Math.round(weightProgressRaw))
  );
  const remainingToGoal = formatOneDecimal(Math.abs(currentWeight - goalWeight));
  const goalDirectionLabel =
    currentWeight > goalWeight
      ? "Залишилось"
      : currentWeight < goalWeight
        ? "Набрати"
        : "Ціль";
  const currentMotivation = {
    topic: getRank(motivationData.currentStreak),
    text: motivationData.dailyQuote,
  };
  const motivationThemeClasses =
    MOTIVATION_THEME_CLASSES[motivationTheme] || MOTIVATION_THEME_CLASSES.light;
  const appThemeClasses = APP_THEMES[appTheme] || APP_THEMES.glow;
  const dashboardThemeStyle =
    DASHBOARD_THEME_STYLES[appTheme] || DASHBOARD_THEME_STYLES.glow;
  const selectedWorkout = WORKOUT_CARDS[selectedWorkoutIndex];
  const selectedFoodVideo = FOOD_VIDEO_CARDS[selectedFoodVideoIndex];
  const selectedRecipe = RECIPE_CARDS[selectedRecipeIndex];
  const workoutWeekKey = useMemo(getWorkoutWeekKey, []);
  const todayWorkoutIndex = useMemo(getTodayWorkoutIndex, []);
  const todayWorkoutBase = WEEKLY_WORKOUT_SPLIT[todayWorkoutIndex];
  const selectedSplitWorkoutBase = WEEKLY_WORKOUT_SPLIT[selectedSplitIndex] || todayWorkoutBase;
  const workoutDifficultyConfig =
    WORKOUT_DIFFICULTY_LEVELS[workoutDifficulty] || WORKOUT_DIFFICULTY_LEVELS.intermediate;
  const workoutGoalConfig = WORKOUT_GOAL_CONFIGS[workoutGoal] || WORKOUT_GOAL_CONFIGS.tone;
  const todayWorkout = getWorkoutByDifficulty(todayWorkoutBase, workoutDifficulty, workoutGoal);
  const selectedSplitWorkout = getWorkoutByDifficulty(
    selectedSplitWorkoutBase,
    workoutDifficulty,
    workoutGoal
  );
  const getSplitState = (workoutId) =>
    weeklyWorkoutLog[`${workoutWeekKey}:${workoutId}`] || {
      completedExercises: [],
      completed: false,
    };
  const getSplitProgress = (workout) => {
    const state = getSplitState(workout.id);
    return Math.round(
      ((state.completedExercises?.length || 0) / workout.exercises.length) * 100
    );
  };
  const todayWorkoutState = getSplitState(todayWorkout.id);
  const todayWorkoutProgress = getSplitProgress(todayWorkout);
  const selectedSplitState = getSplitState(selectedSplitWorkout.id);
  const selectedSplitProgress = getSplitProgress(selectedSplitWorkout);
  const recentWorkoutHistory = workoutHistory
    .slice()
    .sort((a, b) => String(b.completedAt || "").localeCompare(String(a.completedAt || "")))
    .slice(0, 5);
  const activeWorkoutIndex =
    activeWorkout?.id === selectedSplitWorkout.id
      ? Math.min(
          activeWorkout.currentExercise || 0,
          Math.max(selectedSplitWorkout.exercises.length - 1, 0)
        )
      : 0;
  const activeWorkoutExercise = selectedSplitWorkout.exercises[activeWorkoutIndex];
  const activeWorkoutIllustrationType = activeWorkoutExercise
    ? getExerciseIllustrationType(activeWorkoutExercise, selectedSplitWorkout, activeWorkoutIndex)
    : "spark";
  const isSelectedWorkoutActive = activeWorkout?.id === selectedSplitWorkout.id;
  const activeWorkoutStepProgress = selectedSplitWorkout.exercises.length
    ? Math.round(((activeWorkoutIndex + 1) / selectedSplitWorkout.exercises.length) * 100)
    : 0;
  const workoutStreak = getWorkoutStreakCount(weeklyWorkoutLog);
  const todayDateKey = getLocalDateKey();
  const weeklyCalendarProgress = WEEKLY_WORKOUT_SPLIT.map((workout, index) => {
    const workoutDate = addDaysToDateKey(workoutWeekKey, index);
    const workoutState = getSplitState(workout.id);
    const status = workoutState.completed
      ? "completed"
      : workoutDate < todayDateKey
        ? "missed"
        : "planned";

    return {
      ...workout,
      date: workoutDate,
      dayLabel: WORKOUT_DAY_LABELS[index],
      progress: getSplitProgress(workout),
      status,
    };
  });
  const completedWorkoutDays = weeklyCalendarProgress.filter(
    (day) => day.status === "completed"
  ).length;
  const missedWorkoutDays = weeklyCalendarProgress.filter(
    (day) => day.status === "missed"
  ).length;
  const workoutCompletedDateCount = getWorkoutCompletedDates(weeklyWorkoutLog).size;
  const waterGoalDaysCount = Object.values(waterDailyLog).filter(
    (value) => Number(value) >= waterGoal
  ).length;
  const sleepGoalDaysCount = Object.values(sleepDailyLog).filter(
    (entry) => getSleepHours(entry?.bedTime, entry?.wakeTime) >= sleepGoal
  ).length;
  const featureShortcuts = [
    {
      target: "water",
      icon: "H2O",
      label: "Вода",
      value: `${waterConsumedMl} мл`,
      detail: `${waterProgress}% цілі`,
      accent: "from-cyan-400 to-blue-500",
    },
    {
      target: "sleep",
      icon: "ZZ",
      label: "Сон",
      value: `${sleepHours} год`,
      detail: `${sleepProgress}% цілі`,
      accent: "from-indigo-400 to-purple-500",
    },
    {
      target: "training",
      icon: "FIT",
      label: "Тренування",
      value: selectedSplitWorkout?.title || selectedWorkout?.title || "План",
      detail: `${selectedSplitProgress}% прогрес`,
      accent: "from-orange-400 to-pink-500",
    },
    {
      target: "nutrition",
      icon: "KCAL",
      label: "Їжа",
      value: `${caloriesTodayTotal} ккал`,
      detail: `${todayDiaryEntries.length} записів`,
      accent: "from-emerald-400 to-cyan-400",
    },
    {
      target: "progress",
      icon: "CM",
      label: "Заміри",
      value: measurements.length ? `${measurements.length} записів` : "Додати",
      detail: latestMeasurement ? latestMeasurement.date : "Талія, стегна, груди",
      accent: "from-violet-400 to-fuchsia-500",
    },
    {
      target: "cycle",
      icon: "DAY",
      label: "Цикл",
      value: cycleInfo.ready ? `${cycleInfo.day} день` : "Додати",
      detail: cycleInfo.phase,
      accent: "from-pink-400 to-rose-500",
    },
    {
      target: "habits",
      icon: "OK",
      label: "Звички",
      value: `${completedHabits}/${habits.length}`,
      detail: `${habitPerfectDays7Days}/7 ідеальних днів`,
      accent: "from-purple-400 to-pink-500",
    },
  ];
  const progressAnalytics = useMemo(() => {
    const dates = getLastDateKeys(7);
    const dateSet = new Set(dates);
    const caloriesByDate = dates.reduce((acc, date) => ({ ...acc, [date]: 0 }), {});

    foodDiary.forEach((item) => {
      const dateKey = item.date || item.createdAt?.slice(0, 10);
      if (!dateSet.has(dateKey)) return;
      caloriesByDate[dateKey] += Number(item.calories) || 0;
    });

    const waterValues = dates.map((date) => Number(waterDailyLog[date]) || 0);
    const calorieValues = dates.map((date) => caloriesByDate[date] || 0);
    const sleepValues = dates.map((date) => {
      const entry = sleepDailyLog[date] || {};
      return getSleepHours(entry.bedTime, entry.wakeTime);
    });
    const completedWorkoutCount = Object.values(weeklyWorkoutLog).filter((item) => {
      if (!item?.completed) return false;
      const dateKey = item.completedDate || item.completedAt?.slice(0, 10);
      return dateSet.has(dateKey);
    }).length;

    const averageWater = Math.round(
      waterValues.reduce((sum, value) => sum + value, 0) / dates.length
    );
    const averageCalories = Math.round(
      calorieValues.reduce((sum, value) => sum + value, 0) / dates.length
    );
    const averageSleep = formatOneDecimal(
      sleepValues.reduce((sum, value) => sum + value, 0) / dates.length
    );
    const nutritionConsistency = clampScore(
      calorieValues.reduce((sum, value) => {
        if (!value) return sum;
        const score =
          100 -
          (Math.abs(value - dailyNutritionGoals.calories) /
            dailyNutritionGoals.calories) *
            100;
        return sum + Math.max(0, score);
      }, 0) / dates.length
    );
    const waterConsistency = clampScore(
      waterValues.reduce((sum, value) => sum + Math.min(value / waterGoal, 1) * 100, 0) /
        dates.length
    );
    const sleepConsistency = clampScore(
      sleepValues.reduce((sum, value) => sum + Math.min(value / sleepGoal, 1) * 100, 0) /
        dates.length
    );
    const workoutConsistency = clampScore((completedWorkoutCount / 4) * 100);
    const glowUpScore = clampScore(
      (nutritionConsistency + waterConsistency + sleepConsistency + workoutConsistency) / 4
    );
    const lowestArea = [
      { key: "sleep", label: "сон", score: sleepConsistency },
      { key: "water", label: "воду", score: waterConsistency },
      { key: "nutrition", label: "харчування", score: nutritionConsistency },
      { key: "training", label: "тренування", score: workoutConsistency },
    ].sort((a, b) => a.score - b.score)[0];
    const aiTip =
      glowUpScore >= 85
        ? "Ти тримаєш дуже сильний ритм. Наступний крок - не ускладнювати, а стабільно повторювати базу."
        : lowestArea.key === "sleep"
          ? "Найбільше просідає сон. Спробуй 2-3 вечори поспіль лягати на 30 хв раніше, і тренування підуть легше."
          : lowestArea.key === "water"
            ? "Вода просить уваги. Постав пляшку поруч і добирай по 250 мл між прийомами їжі."
            : lowestArea.key === "nutrition"
              ? "Харчування ще нестабільне. Почни з одного точного запису їжі щодня, особливо білка."
              : "Тренування можна зробити регулярнішими. Навіть коротке 15-хв заняття рахується як перемога.";

    return {
      averageSleep,
      averageWater,
      averageCalories,
      completedWorkoutCount,
      workoutStreak,
      totalXp,
      level: glowUpLevel.level,
      levelProgress: glowUpLevel.progress,
      nutritionConsistency,
      waterConsistency,
      sleepConsistency,
      workoutConsistency,
      glowUpScore,
      lowestArea,
      aiTip,
      cards: [
        {
          title: "Середній сон",
          value: `${averageSleep} год`,
          subtitle: `Ціль: ${sleepGoal} год`,
          icon: "🌙",
          percent: sleepConsistency,
          accent: "from-indigo-300 to-purple-400",
          advice: sleepConsistency >= 80 ? "Відновлення стабільне." : "Додай спокійний вечірній ритм.",
        },
        {
          title: "Середня вода",
          value: `${averageWater} мл`,
          subtitle: `Ціль: ${waterGoal} мл`,
          icon: "💧",
          percent: waterConsistency,
          accent: "from-cyan-300 to-blue-500",
          advice: waterConsistency >= 80 ? "Гідратація тримається." : "Додавай воду маленькими порціями.",
        },
        {
          title: "Середні калорії",
          value: `${averageCalories} ккал`,
          subtitle: `Ціль: ${dailyNutritionGoals.calories} ккал`,
          icon: "🔥",
          percent: nutritionConsistency,
          accent: "from-orange-300 to-pink-500",
          advice: nutritionConsistency >= 80 ? "Харчування рівне." : "Записуй прийоми їжі щодня.",
        },
        {
          title: "Тренування",
          value: `${completedWorkoutCount}/7`,
          subtitle: `Серія: ${workoutStreak} дн.`,
          icon: "🏋️",
          percent: workoutConsistency,
          accent: "from-pink-400 to-purple-500",
          advice: workoutConsistency >= 75 ? "Тиждень активний." : "Заплануй 3-4 короткі сесії.",
        },
      ],
    };
  }, [
    foodDiary,
    waterDailyLog,
    sleepDailyLog,
    weeklyWorkoutLog,
    dailyNutritionGoals.calories,
    waterGoal,
    sleepGoal,
    workoutStreak,
    totalXp,
    glowUpLevel.level,
    glowUpLevel.progress,
  ]);
  const achievementStats = {
    "first-workout": workoutCompletedDateCount >= 1,
    "workout-7": workoutCompletedDateCount >= 7,
    "workout-30": workoutCompletedDateCount >= 30,
    "first-food": foodDiary.length >= 1,
    "first-ai-scan": foodDiary.some((item) => item.source === "openai"),
    "water-7": waterGoalDaysCount >= 7,
    "sleep-7": sleepGoalDaysCount >= 7,
    "level-5": glowUpLevel.level >= 5,
    "level-10": glowUpLevel.level >= 10,
    "score-80": progressAnalytics.glowUpScore >= 80,
  };
  const achievementCards = ACHIEVEMENT_DEFINITIONS.map((badge) => ({
    ...badge,
    unlocked: Boolean(unlockedBadges[badge.id]),
    unlockedAt: unlockedBadges[badge.id]?.unlockedAt || "",
    ready: Boolean(achievementStats[badge.id]),
  }));
  const latestAchievement = achievementCards
    .filter((badge) => badge.unlocked)
    .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))[0];
  const getChallengeStartKey = (challengeId) =>
    challengeState[challengeId]?.startedAt?.slice(0, 10) || null;
  const isAfterChallengeStart = (dateKey, challengeId) => {
    const startKey = getChallengeStartKey(challengeId);
    return !startKey || dateKey >= startKey;
  };
  const challengeProgressById = {
    "workout-no-skip-7": workoutStreak,
    "water-goal-7": Object.entries(waterDailyLog).filter(
      ([date, value]) =>
        isAfterChallengeStart(date, "water-goal-7") && Number(value) >= waterGoal
    ).length,
    "sleep-goal-7": Object.entries(sleepDailyLog).filter(
      ([date, entry]) =>
        isAfterChallengeStart(date, "sleep-goal-7") &&
        getSleepHours(entry?.bedTime, entry?.wakeTime) >= sleepGoal
    ).length,
    "ai-food-scans-5": foodDiary.filter(
      (item) =>
        item.source === "openai" &&
        isAfterChallengeStart(item.date || item.createdAt?.slice(0, 10), "ai-food-scans-5")
    ).length,
    "food-diary-10": foodDiary.filter((item) =>
      isAfterChallengeStart(item.date || item.createdAt?.slice(0, 10), "food-diary-10")
    ).length,
    "posture-workouts-3": Object.entries(weeklyWorkoutLog).filter(([key, item]) => {
      const dateKey = item?.completedDate || item?.completedAt?.slice(0, 10);
      return (
        item?.completed &&
        key.includes("back-posture") &&
        isAfterChallengeStart(dateKey, "posture-workouts-3")
      );
    }).length,
    "steps-10000-5": Object.entries(stepsDailyLog).filter(
      ([date, value]) =>
        isAfterChallengeStart(date, "steps-10000-5") && Number(value) >= 10000
    ).length,
  };
  const challengeCards = CHALLENGE_DEFINITIONS.map((challenge) => {
    const saved = challengeState[challenge.id] || {};
    const status = saved.status === "completed" ? "completed" : saved.status === "active" ? "active" : "locked";
    const rawProgress = status === "locked" ? 0 : challengeProgressById[challenge.id] || 0;
    const progress = Math.min(rawProgress, challenge.target);

    return {
      ...challenge,
      progress,
      percent: Math.min(Math.round((progress / challenge.target) * 100), 100),
      status,
      startedAt: saved.startedAt || "",
      completedAt: saved.completedAt || "",
    };
  });
  const profileName = profile.name?.trim() || "подруго";
  const t = (key) => {
    const pack = TRANSLATIONS[appLanguage] || TRANSLATIONS.en;
    return pack[key] || TRANSLATIONS.en[key] || TRANSLATIONS.uk[key] || key;
  };
  const personalPlan = useMemo(
    () =>
      buildPersonalPlan({
        profile,
        currentWeight,
        calories: caloriesTodayTotal,
        caloriesGoal,
        steps,
        stepsGoal,
        waterGlasses: waterGlassesToday,
        waterConsumedMl,
        waterGoal,
        habitProgress,
        completedHabits,
        habitsCount: habits.length,
        selectedMinutes,
      }),
    [
      profile,
      currentWeight,
      caloriesTodayTotal,
      caloriesGoal,
      steps,
      waterGlassesToday,
      waterConsumedMl,
      waterGoal,
      habitProgress,
      completedHabits,
      habits.length,
      selectedMinutes,
    ]
  );
  const charlieCoachContext = useMemo(
    () => ({
      today: getLocalDateKey(),
      profileName,
      language: appLanguage,
      goal: profile.goal || "",
      currentWeight,
      calories: {
        eaten: caloriesTodayTotal,
        goal: dailyNutritionGoals.calories,
        protein: todayDiaryProtein,
        fat: todayDiaryFat,
        carbs: todayDiaryCarbs,
        diaryItems: todayDiaryEntries.length,
      },
      water: {
        consumedMl: waterConsumedMl,
        goalMl: waterGoal,
        progress: waterProgress,
      },
      sleep: {
        hours: sleepHours,
        goal: sleepGoal,
        quality: sleepQuality.label,
        mood: sleepMood,
      },
      steps: {
        today: steps,
        goal: stepsGoal,
        distanceKm: stepsDistanceKm,
      },
      habits: {
        completed: completedHabits,
        total: habits.length,
        streakDays: habitStreakDays,
      },
      workout: {
        title: selectedSplitWorkout.title,
        progress: selectedSplitProgress,
        active: Boolean(activeWorkout?.id),
        streak: workoutStreak,
      },
      cycle: {
        ready: cycleInfo.ready,
        day: cycleInfo.day,
        phase: cycleInfo.phase,
        daysToNext: cycleInfo.daysToNext,
      },
      plan: {
        summary: personalPlan.summary,
        focus: personalPlan.workMore,
        nextStep: personalPlan.nextSteps?.[0] || "",
      },
    }),
    [
      activeWorkout?.id,
      appLanguage,
      caloriesTodayTotal,
      completedHabits,
      currentWeight,
      cycleInfo,
      dailyNutritionGoals.calories,
      habitStreakDays,
      habits.length,
      personalPlan,
      profile.goal,
      profileName,
      selectedSplitProgress,
      selectedSplitWorkout.title,
      sleepGoal,
      sleepHours,
      sleepMood,
      sleepQuality.label,
      steps,
      stepsDistanceKm,
      stepsGoal,
      todayDiaryCarbs,
      todayDiaryEntries.length,
      todayDiaryFat,
      todayDiaryProtein,
      waterConsumedMl,
      waterGoal,
      waterProgress,
      workoutStreak,
    ]
  );
  const onboardingPlan = useMemo(
    () => buildOnboardingPlan(onboardingData),
    [onboardingData]
  );

  const timerLabel = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }, [secondsLeft]);

  useEffect(() => {
    if (!isTimerRunning) return;

    const intervalId = window.setInterval(() => {
      setSecondsLeft((seconds) => {
        if (seconds <= 1) {
          setIsTimerRunning(false);
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isTimerRunning]);

  useEffect(() => {
    if (!activeWorkout || isTimerRunning || secondsLeft !== 0) return;

    setWorkoutPlanNotice("Час вправи завершено. Натисни «Наступна вправа», щоб перейти далі.");

    if (settingsToggles.vibration && navigator.vibrate) {
      navigator.vibrate([35, 25, 35]);
    }
  }, [
    activeWorkout?.currentExercise,
    activeWorkout?.id,
    isTimerRunning,
    secondsLeft,
    settingsToggles.vibration,
  ]);

  useEffect(() => {
    setDailyMotivation(loadAIDailyMotivation());
  }, []);

  useEffect(() => {
    let isMounted = true;

    getAppNotificationPermission()
      .then((permission) => {
        if (!isMounted) return;
        setNotificationPermission(permission);

        const isEnabled =
          localStorage.getItem("notificationsEnabled") === "true" &&
          permission === "granted";
        setNotificationsEnabled(isEnabled);
        setSettingsToggles((settings) => ({
          ...settings,
          notifications: isEnabled,
        }));
      })
      .catch(() => {
        if (isMounted) {
          setNotificationPermission("unsupported");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }

    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;

      setShowQuickActions(false);
      setIsSettingsOpen(false);
      setShowProfile(false);
      setOpenedDish(null);
      setOpenedWorkout(null);
      setIsCharlieOpen(false);

      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
        setCameraTarget(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [cameraStream]);

  useEffect(() => {
    localStorage.setItem("userHabits", JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem("habitDailyLog", JSON.stringify(habitDailyLog));
  }, [habitDailyLog]);

  useEffect(() => {
    localStorage.setItem("cycleTracker", JSON.stringify(cycleTracker));
  }, [cycleTracker]);

  useEffect(() => {
    localStorage.setItem("cycleHistory", JSON.stringify(cycleHistory));
  }, [cycleHistory]);

  useEffect(() => {
    localStorage.setItem("userProfile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(
      ONBOARDING_DATA_KEY,
      JSON.stringify({
        ...onboardingData,
        bodyPhoto: keepLocalPhoto(onboardingData.bodyPhoto),
      })
    );
  }, [onboardingData]);

  useEffect(() => {
    localStorage.setItem("glowupXpState", JSON.stringify(xpState));
  }, [xpState]);

  useEffect(() => {
    localStorage.setItem("glowupBadges", JSON.stringify(unlockedBadges));
  }, [unlockedBadges]);

  useEffect(() => {
    localStorage.setItem("glowupChallenges", JSON.stringify(challengeState));
  }, [challengeState]);

  useEffect(() => {
    const data = {
      gender: profile.gender || "",
      weight: currentWeight,
      water: waterGlassesToday,
      beforePhoto: keepLocalPhoto(beforePhoto) || null,
      afterPhoto: keepLocalPhoto(afterPhoto) || null,
      foodPhoto: null,
      foodName,
      foodResult,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...data,
          beforePhoto: null,
          afterPhoto: null,
          foodPhoto: null,
        })
      );
    }
  }, [
    profile.gender,
    currentWeight,
    waterGlassesToday,
    beforePhoto,
    afterPhoto,
    foodPhoto,
    foodName,
    foodResult,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem("foodDiary", JSON.stringify(foodDiary));
    } catch {
      localStorage.setItem("foodDiary", JSON.stringify(stripLargePhotosFromDiary(foodDiary)));
    }
  }, [foodDiary]);

  useEffect(() => {
    localStorage.setItem("nutritionGoals", JSON.stringify(nutritionGoals));
  }, [nutritionGoals]);

  useEffect(() => {
    localStorage.setItem("bodyMeasurements", JSON.stringify(measurements));
  }, [measurements]);

  useEffect(() => {
    let isMounted = true;

    const syncWidgetStats = () =>
      getGlowUpWidgetStats()
        .then((stats) => {
          if (!isMounted || !stats) return;

          const today = getLocalDateKey();
          if (stats.waterDate === today) {
            const nativeWaterMl = Number(stats.waterMl) || 0;
            setWaterDailyLog((log) => ({
              ...log,
              [today]: Math.max(Number(log[today]) || 0, nativeWaterMl),
            }));
          }

          if (Number(stats.steps) > 0) {
            setSteps(Number(stats.steps));
          }
        })
        .catch((error) => {
          console.warn("[GlowUp Widget] read failed", error);
        })
        .finally(() => {
          if (isMounted) {
            setWidgetStatsReady(true);
          }
        });

    const syncOnVisible = () => {
      if (document.visibilityState === "visible") {
        syncWidgetStats();
      }
    };

    syncWidgetStats();
    window.addEventListener("focus", syncWidgetStats);
    document.addEventListener("visibilitychange", syncOnVisible);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", syncWidgetStats);
      document.removeEventListener("visibilitychange", syncOnVisible);
    };
  }, []);

  useEffect(() => {
    syncAndroidSteps();
    if (!hasNativeStepCounter()) return undefined;

    const intervalId = window.setInterval(() => {
      syncAndroidSteps();
    }, 5 * 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    refreshAndroidStepsStatus();
  }, []);

  useEffect(() => {
    if (!widgetStatsReady) return;

    updateGlowUpWidget({
      waterMl: waterConsumedMl,
      waterGoalMl: waterGoal,
      waterDate: todayWaterKey,
      weightKg: currentWeight ? formatOneDecimal(currentWeight) : "",
      steps,
      activeCalories,
      caloriesConsumed: caloriesTodayTotal,
      dailyCaloriesGoal,
      remainingCalories,
    })
      .then(() => refreshGlowUpWidgetStatus())
      .catch((error) => {
        console.warn("[GlowUp Widget] update failed", error);
      });
  }, [
    activeCalories,
    caloriesTodayTotal,
    currentWeight,
    dailyCaloriesGoal,
    remainingCalories,
    steps,
    todayWaterKey,
    waterConsumedMl,
    waterGoal,
    widgetStatsReady,
  ]);

  useEffect(() => {
    localStorage.setItem("waterDailyLog", JSON.stringify(waterDailyLog));
  }, [waterDailyLog]);

  useEffect(() => {
    setWaterDailyLog((log) =>
      Object.prototype.hasOwnProperty.call(log, todayWaterKey)
        ? log
        : { ...log, [todayWaterKey]: 0 }
    );
  }, [todayWaterKey]);

  useEffect(() => {
    localStorage.setItem("waterGoalMl", String(waterGoalMl));
  }, [waterGoalMl]);

  useEffect(() => {
    localStorage.setItem("waterReminderInterval", waterReminderInterval);
  }, [waterReminderInterval]);

  useEffect(() => {
    localStorage.setItem("sleepDailyLog", JSON.stringify(sleepDailyLog));
  }, [sleepDailyLog]);

  useEffect(() => {
    localStorage.setItem("sleepGoalHours", String(sleepGoalHours));
  }, [sleepGoalHours]);

  useEffect(() => {
    localStorage.setItem("bedtimeReminderTime", bedtimeReminderTime);
  }, [bedtimeReminderTime]);

  useEffect(() => {
    setStepsDailyLog((log) => ({
      ...log,
      [todayStepsKey]: Number(steps) || 0,
    }));
  }, [steps, todayStepsKey]);

  useEffect(() => {
    localStorage.setItem("stepsDailyLog", JSON.stringify(stepsDailyLog));
  }, [stepsDailyLog]);

  useEffect(() => {
    if (!settingsToggles.waterReminder) return undefined;
    if (isCapacitorAndroid()) return undefined;
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return undefined;
    }

    const intervalMs = Number(waterReminderInterval) * 60 * 60 * 1000;
    const timerId = window.setInterval(() => {
      new Notification("GlowUp вода", {
        body: `Час випити воду 💧 Зараз: ${waterConsumedMl}/${waterGoal} мл.`,
      });
    }, intervalMs);

    return () => window.clearInterval(timerId);
  }, [settingsToggles.waterReminder, waterReminderInterval, waterConsumedMl, waterGoal, notificationPermission]);

  useEffect(() => {
    if (!isCapacitorAndroid()) return;

    scheduleNativeWaterReminders({
      enabled: settingsToggles.waterReminder,
      intervalHours: waterReminderInterval,
      waterConsumedMl,
      waterGoal,
    }).catch(() => {});
  }, [settingsToggles.waterReminder, waterReminderInterval, waterConsumedMl, waterGoal]);

  useEffect(() => {
    if (waterConsumedMl >= waterGoal) {
      awardXp(`water-goal:${todayWaterKey}`, 25, "Вода досягла цілі");
    }
  }, [waterConsumedMl, waterGoal, todayWaterKey]);

  useEffect(() => {
    if (sleepHours >= sleepGoal) {
      awardXp(`sleep-goal:${todaySleepKey}`, 25, "Сон досяг цілі");
    }
  }, [sleepHours, sleepGoal, todaySleepKey]);

  useEffect(() => {
    const milestone = Math.floor(workoutStreak / 7) * 7;
    if (milestone >= 7) {
      awardXp(`workout-streak:${milestone}`, 100, `${milestone} днів streak`);
    }
  }, [workoutStreak]);

  useEffect(() => {
    ACHIEVEMENT_DEFINITIONS.forEach((badge) => {
      if (!achievementStats[badge.id] || unlockedBadges[badge.id]) return;

      setUnlockedBadges((current) => {
        if (current[badge.id]) return current;

        setAchievementMessage(`Бейдж відкрито: ${badge.title}`);
        window.setTimeout(() => setAchievementMessage(""), 2600);
        awardXp(`badge:${badge.id}`, 25, `Бейдж: ${badge.title}`);

        return {
          ...current,
          [badge.id]: {
            unlockedAt: new Date().toISOString(),
          },
        };
      });
    });
  }, [
    workoutCompletedDateCount,
    foodDiary.length,
    latestAiFoodScan,
    waterGoalDaysCount,
    sleepGoalDaysCount,
    glowUpLevel.level,
    progressAnalytics.glowUpScore,
    unlockedBadges,
  ]);

  useEffect(() => {
    challengeCards.forEach((challenge) => {
      if (challenge.status !== "active" || challenge.progress < challenge.target) return;

      setChallengeState((state) => {
        const current = state[challenge.id] || {};
        if (current.status === "completed") return state;

        setChallengeMessage(`Челендж завершено: ${challenge.title}`);
        window.setTimeout(() => setChallengeMessage(""), 2600);
        awardXp(`challenge:${challenge.id}`, 75, `Челендж: ${challenge.title}`);

        return {
          ...state,
          [challenge.id]: {
            ...current,
            status: "completed",
            completedAt: new Date().toISOString(),
            badgeUnlocked: true,
          },
        };
      });
    });
  }, [challengeCards]);

  useEffect(() => {
    if (!settingsToggles.sleepReminder) return undefined;
    if (isCapacitorAndroid()) return undefined;
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return undefined;
    }

    let timeoutId;

    const scheduleSleepReminder = () => {
      const delay = getReminderDelay(bedtimeReminderTime);
      if (delay === null) return;

      timeoutId = window.setTimeout(() => {
        new Notification("GlowUp сон", {
          body: `Час готуватися до сну. Ціль: ${sleepGoal} год для кращого відновлення.`,
        });
        scheduleSleepReminder();
      }, delay);
    };

    scheduleSleepReminder();

    return () => window.clearTimeout(timeoutId);
  }, [settingsToggles.sleepReminder, bedtimeReminderTime, sleepGoal, notificationPermission]);

  useEffect(() => {
    if (!isCapacitorAndroid()) return;

    scheduleNativeSleepReminder({
      enabled: settingsToggles.sleepReminder,
      reminderTime: bedtimeReminderTime,
      sleepGoal,
    }).catch(() => {});
  }, [settingsToggles.sleepReminder, bedtimeReminderTime, sleepGoal]);

  useEffect(() => {
    if (!sleepWakeTime) {
      setSleepAlarmMessage("");
      if (isCapacitorAndroid()) {
        scheduleNativeWakeAlarm({ enabled: false, wakeTime: "" }).catch(() => {});
      }
      return undefined;
    }

    if (isCapacitorAndroid()) {
      scheduleNativeWakeAlarm({
        enabled: true,
        wakeTime: sleepWakeTime,
      })
        .then((result) => {
          if (result?.scheduled) {
            setSleepAlarmMessage(`Будильник з вібрацією встановлено на ${sleepWakeTime}.`);
          } else if (result?.permission !== "granted") {
            setSleepAlarmMessage("Дозволь Notifications в Android, щоб будильник спрацював.");
          }
        })
        .catch((error) => {
          console.warn("Wake alarm scheduling failed", error);
          setSleepAlarmMessage("Не вдалося встановити будильник. Перевір дозвіл Notifications.");
        });
      return undefined;
    }

    if (!("Notification" in window) || Notification.permission !== "granted") {
      setSleepAlarmMessage("Дозволь сповіщення, щоб будильник спрацював.");
      return undefined;
    }

    const delay = getReminderDelay(sleepWakeTime);
    if (delay === null) return undefined;

    setSleepAlarmMessage(`Будильник встановлено на ${sleepWakeTime}.`);
    const timeoutId = window.setTimeout(() => {
      new Notification("GlowUp будильник", {
        body: "Час прокидатися. Почни день м'яко: вода і кілька рухів.",
      });
      if (settingsToggles.vibration && navigator.vibrate) {
        navigator.vibrate([250, 120, 250, 120, 250]);
      }
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [sleepWakeTime, notificationPermission, settingsToggles.vibration]);

  useEffect(() => {
    if (!isCapacitorAndroid()) return;

    scheduleNativeAiCoachReminder({
      enabled: notificationsEnabled && settingsToggles.aiCoach,
    }).catch(() => {});
  }, [notificationsEnabled, settingsToggles.aiCoach, notificationPermission]);

  useEffect(() => {
    document.documentElement.lang = appLanguage;
    localStorage.setItem("appLanguage", appLanguage);
  }, [appLanguage]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!charlieDragRef.current) return;

      const { offsetX, offsetY } = charlieDragRef.current;
      const nextX = Math.min(
        Math.max(event.clientX - offsetX, 8),
        window.innerWidth - 56
      );
      const nextY = Math.min(
        Math.max(event.clientY - offsetY, 8),
        window.innerHeight - 56
      );

      setCharliePosition({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      charlieDragRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const stopCamera = () => {
    if (!cameraStream) return;
    cameraStream.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setCameraTarget(null);
  };

  const openCameraFallback = (target) => {
    setCameraFallbackTarget(target);
    setShowQuickActions(false);
    window.requestAnimationFrame(() => {
      cameraFallbackInputRef.current?.click();
    });
  };

  const pickFoodPhotoFromGallery = async () => {
    setShowQuickActions(false);
    setFoodAnalysisError("");

    if (!isCapacitorAndroid()) {
      openCameraFallback("food");
      return;
    }

    try {
      const { results = [] } = await Camera.chooseFromGallery({
        mediaType: MediaTypeSelection.Photo,
        allowMultipleSelection: false,
        quality: 75,
        targetWidth: 1200,
        targetHeight: 1200,
        correctOrientation: true,
        editable: "no",
      });
      const photo = results[0];

      if (!photo?.webPath) {
        setFoodAnalysisError("Фото з галереї не вибрано.");
        return;
      }

      const response = await fetch(photo.webPath);
      if (!response.ok) {
        throw new Error(`Не вдалося прочитати фото з галереї: ${response.status}`);
      }
      const blob = await response.blob();
      const file = new File([blob], "food-gallery-photo.jpg", {
        type: blob.type || "image/jpeg",
      });
      const image = await compressImageFile(file);

      console.log("[GlowUp AI Food Scan] selected image", {
        source: "capacitor-gallery",
        type: photo.type,
        format: photo.metadata?.format,
        bytes: blob.size,
        saved: Boolean(photo.saved),
        chars: image.length,
      });

      setFoodPhoto(image);
      setFoodResult(null);
      window.requestAnimationFrame(() => analyzeFood(image));
    } catch (error) {
      console.error("[GlowUp AI Food Scan] gallery picker failed", error);
      setFoodAnalysisError(error.message || "Не вдалося відкрити галерею.");
    }
  };

  const shouldUseCameraFallback = () => {
    const host = window.location.hostname;
    const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
    return !window.isSecureContext && !isLocalHost;
  };

  const startCamera = async (target) => {
    if (isCapacitorAndroid() && target === "food") {
      openCameraFallback(target);
      return;
    }

    if (shouldUseCameraFallback()) {
      openCameraFallback(target);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      openCameraFallback(target);
      return;
    }

    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: target === "food" ? "environment" : "user" },
        audio: false,
      });

      setCameraTarget(target);
      setCameraStream(stream);
    } catch {
      openCameraFallback(target);
      return;
    }
  };

  const analyzeFood = async (imageOverride = foodPhoto) => {
    setFoodAnalysisError("");

    if (!imageOverride) {
      setFoodResult(null);
      setFoodAnalysisError("Додай або сфотографуй їжу, щоб Чарлі міг зробити AI-аналіз.");
      return;
    }

    if (!foodPhoto && typeof imageOverride === "string" && imageOverride.startsWith("data:image/")) {
      setFoodPhoto(imageOverride);
    }

    console.log("[GlowUp AI Food Scan] analyzeFood input", {
      hasImage: Boolean(imageOverride),
      kind: typeof imageOverride,
      stringLength: typeof imageOverride === "string" ? imageOverride.length : undefined,
      startsWithDataImage:
        typeof imageOverride === "string" ? imageOverride.startsWith("data:image/") : undefined,
      foodName,
    });

    setFoodAnalysisLoading(true);

    try {
      const result = await analyzeFoodImage({ image: imageOverride, foodName, language: appLanguage });
      console.log("[GlowUp AI Food Scan] analyzeFood result", result);
      setFoodResult(result);
      setFoodAnalysisError("");
    } catch (error) {
      console.error("[GlowUp AI Food Scan] analyzeFood error", error);
      setFoodResult(null);
      setFoodAnalysisError(
        error.message ||
          "Не вдалося виконати AI-аналіз. Перевір ключ OpenAI або спробуй інше фото."
      );
    } finally {
      setFoodAnalysisLoading(false);
    }
  };

  const awardXp = (key, amount, reason) => {
    if (!key || !amount) return;

    setXpState((state) => {
      const awarded = state.awarded || {};
      if (awarded[key]) return state;

      const previousXp = Number(state.totalXp) || 0;
      const nextXp = previousXp + amount;
      const previousLevel = getGlowUpLevelInfo(previousXp).level;
      const nextLevel = getGlowUpLevelInfo(nextXp).level;

      if (nextLevel > previousLevel) {
        setLevelUpMessage(`Level up! Рівень ${nextLevel}`);
        window.setTimeout(() => setLevelUpMessage(""), 2200);
      } else {
        setLevelUpMessage(`+${amount} XP · ${reason}`);
        window.setTimeout(() => setLevelUpMessage(""), 1600);
      }

      return {
        totalXp: nextXp,
        awarded: {
          ...awarded,
          [key]: {
            amount,
            reason,
            awardedAt: new Date().toISOString(),
          },
        },
      };
    });
  };

  const startChallenge = (challengeId) => {
    setChallengeState((state) => {
      const current = state[challengeId] || {};
      if (current.status === "active" || current.status === "completed") return state;

      return {
        ...state,
        [challengeId]: {
          status: "active",
          startedAt: new Date().toISOString(),
        },
      };
    });
  };

  const addFoodResultToDiary = () => {
    if (!foodResult) return;

    const entry = {
      id: `food-${Date.now()}`,
      date: getLocalDateKey(),
      createdAt: new Date().toISOString(),
      photo: keepLocalPhoto(foodPhoto),
      name: foodResult.name || foodResult.dish || "AI food scan",
      calories: Number(foodResult.calories) || 0,
      protein: Number(foodResult.protein) || 0,
      fat: Number(foodResult.fat) || 0,
      carbs: Number(foodResult.carbs) || 0,
      advice: foodResult.advice || foodResult.note || "",
      source: "openai",
    };

    setFoodDiary((items) => [entry, ...items]);
    awardXp(`ai-food-scan:${entry.id}`, 15, "AI food scan доданий");
    setFoodResult(null);
    setFoodPhoto("");
    setFoodAnalysisError("");
  };

  const openManualFoodForm = () => {
    setDashboardTab("nutrition");
    setShowQuickActions(false);
    window.setTimeout(() => {
      const manualForm =
        manualFoodFormRef.current ||
        [...document.querySelectorAll("h3")]
          .find((heading) => heading.textContent?.includes("Додати їжу"))
          ?.closest(".glow-card");

      manualForm?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);
  };

  const showBarcodeNotice = (message, timeout = 3200) => {
    setBarcodeNotice(message);
    window.setTimeout(() => setBarcodeNotice(""), timeout);
  };

  const lookupBarcodeProduct = async (barcodeOverride = manualFood.barcode) => {
    const barcode = String(barcodeOverride || "").replace(/\D/g, "");
    if (!barcode) {
      showBarcodeNotice("Введи або відскануй штрихкод.");
      return null;
    }

    setBarcodeLookupLoading(true);
    setBarcodeProductError("");
    setBarcodeProduct(null);

    try {
      const candidates = getOpenFoodFactsBarcodeCandidates(barcode);
      let foundData = null;
      let foundBarcode = barcode;

      for (const candidate of candidates) {
        const response = await fetch(
          `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(candidate)}.json`
        );
        if (!response.ok) {
          console.warn("Open Food Facts request failed", {
            barcode: candidate,
            status: response.status,
          });
          continue;
        }

        const data = await response.json();
        console.log("[GlowUp Barcode] Open Food Facts response", {
          requestedBarcode: barcode,
          candidate,
          status: data.status,
          productName: data.product?.product_name || data.product?.product_name_en,
        });

        if (data.status === 1 && data.product) {
          foundData = data;
          foundBarcode = candidate;
          break;
        }
      }

      if (!foundData?.product) {
        setBarcodeProductError("Продукт не знайдено");
        showBarcodeNotice("Продукт не знайдено. Можна додати вручну й зберегти barcode.");
        return null;
      }

      const product = normalizeOpenFoodFactsProduct(foundBarcode, foundData.product, appLanguage);
      setBarcodeProduct(product);
      setBarcodePortionId("piece");
      setBarcodePortionCount(1);
      setBarcodeCustomGrams("");
      setManualFood((food) => ({ ...food, barcode: foundBarcode }));
      showBarcodeNotice("Продукт знайдено. Обери порцію й додай у щоденник.");
      return product;
    } catch (error) {
      console.warn("Open Food Facts lookup failed", error);
      setBarcodeProductError("Продукт не знайдено");
      showBarcodeNotice("Не вдалося знайти продукт. Ручне додавання доступне.");
      return null;
    } finally {
      setBarcodeLookupLoading(false);
    }
  };

  const scanFoodBarcode = async () => {
    if (isBarcodeScanning) return;

    if (!isCapacitorAndroid()) {
      showBarcodeNotice("Сканер доступний в Android-додатку. Можна ввести штрихкод вручну.");
      return;
    }

    setIsBarcodeScanning(true);
    setBarcodeNotice("");

    try {
      const { supported } = await BarcodeScanner.isSupported();
      if (!supported) {
        showBarcodeNotice("Камера або сканер недоступні на цьому пристрої. Залиши ручне введення.");
        return;
      }

      const moduleStatus = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable().catch(
        () => ({ available: true })
      );
      if (moduleStatus.available === false) {
        await BarcodeScanner.installGoogleBarcodeScannerModule().catch(() => {});
        showBarcodeNotice(
          "Модуль сканера встановлюється. Якщо камера не відкрилась, введи штрихкод вручну або спробуй ще раз.",
          5200
        );
        return;
      }

      const currentPermission = await BarcodeScanner.checkPermissions();
      const cameraPermission =
        currentPermission.camera === "granted"
          ? currentPermission.camera
          : (await BarcodeScanner.requestPermissions()).camera;

      if (cameraPermission !== "granted") {
        showBarcodeNotice("Немає доступу до камери. Ручне введення штрихкоду лишається доступним.");
        return;
      }

      const result = await BarcodeScanner.scan({
        formats: FOOD_BARCODE_FORMATS,
        autoZoom: true,
      });
      const barcodeValue = result.barcodes
        ?.map((barcode) => barcode.rawValue || barcode.displayValue || "")
        .map((value) => value.trim())
        .find((value) => /^\d{6,14}$/.test(value));

      if (!barcodeValue) {
        showBarcodeNotice("EAN/UPC штрихкод не знайдено. Можна ввести номер вручну.");
        return;
      }

      setManualFood((food) => ({ ...food, barcode: barcodeValue }));
      await lookupBarcodeProduct(barcodeValue);
    } catch (error) {
      console.warn("Barcode scan failed", error);
      showBarcodeNotice("Сканер недоступний або сканування скасовано. Ручне введення працює.");
    } finally {
      setIsBarcodeScanning(false);
    }
  };

  const addBarcodeProductToDiary = () => {
    if (!barcodeProduct || !barcodeNutritionEstimate || !barcodeGrams) return;

    const entry = {
      id: `barcode-food-${Date.now()}`,
      date: getLocalDateKey(),
      createdAt: new Date().toISOString(),
      barcode: barcodeProduct.barcode,
      name: barcodeProduct.name,
      brand: barcodeProduct.brand,
      photo: barcodeProduct.photo,
      ingredients: barcodeProduct.ingredients,
      nutriScore: barcodeProduct.nutriScore,
      sourceUrl: barcodeProduct.sourceUrl,
      grams: barcodeGrams,
      amount: barcodeGrams,
      portionLabel:
        selectedBarcodePortion?.id === "custom"
          ? "custom grams"
          : `${barcodePortionCount} x ${selectedBarcodePortion?.label || "portion"}`,
      calories: barcodeNutritionEstimate.calories,
      protein: Number(barcodeNutritionEstimate.protein) || 0,
      fat: Number(barcodeNutritionEstimate.fat) || 0,
      carbs: Number(barcodeNutritionEstimate.carbs) || 0,
      advice: barcodeProduct.nutriScore
        ? `Nutri-Score: ${String(barcodeProduct.nutriScore).toUpperCase()}`
        : "Додано з Open Food Facts.",
      source: "barcode",
    };

    setFoodDiary((items) => [entry, ...items]);
    awardXp(`barcode-food:${entry.id}`, 10, "Barcode food scan доданий");
    setBarcodeProduct(null);
    setBarcodeProductError("");
    setManualFood((food) => ({
      ...food,
      barcode: "",
    }));
  };

  const updateWaterAmount = (deltaMl) => {
    const current = Number(waterDailyLog[todayWaterKey]) || waterConsumedMl || 0;
    const next = Math.max(0, current + deltaMl);
    setWaterDailyLog((log) => ({ ...log, [todayWaterKey]: next }));
    setWaterGlasses(formatOneDecimal(next / 250));
  };

  const updateSleepEntry = (field, value) => {
    setSleepDailyLog((log) => ({
      ...log,
      [todaySleepKey]: {
        ...(log[todaySleepKey] || {}),
        [field]: value,
        updatedAt: new Date().toISOString(),
      },
    }));

    if (field === "wakeTime" && value) {
      getAppNotificationPermission()
        .then((permission) => {
          setNotificationPermission(permission);
          if (permission === "default") {
            requestNotificationPermission();
          }
        })
        .catch(() => {});

      if (settingsToggles.vibration && navigator.vibrate) {
        navigator.vibrate(35);
      }
    }
  };

  const addManualFoodToDiary = () => {
    const name = manualFood.name.trim();
    if (!name) return;

    const estimate = manualFoodEstimate || {};
    const amount = Number(manualFood.amount) || manualFoodPortion?.grams || 0;

    const entry = {
      id: `manual-food-${Date.now()}`,
      date: getLocalDateKey(),
      createdAt: new Date().toISOString(),
      photo: "",
      name,
      meal: manualFood.meal,
      amount,
      portionHint: manualFoodPortion?.label || "",
      barcode: manualFood.barcode.trim(),
      calories: Number(manualFood.calories) || Number(estimate.calories) || 0,
      protein: Number(manualFood.protein) || Number(estimate.protein) || 0,
      fat: Number(manualFood.fat) || Number(estimate.fat) || 0,
      carbs: Number(manualFood.carbs) || Number(estimate.carbs) || 0,
      advice: "Додано вручну в щоденник харчування.",
      source: "manual",
    };

    setFoodDiary((items) => [entry, ...items]);
    awardXp(`manual-food:${entry.id}`, 10, "Їжа додана в щоденник");
    setManualFood({
      name: "",
      meal: manualFood.meal,
      amount: "",
      barcode: "",
      calories: "",
      protein: "",
      fat: "",
      carbs: "",
    });
  };

  const removeFoodDiaryEntry = (id) => {
    setFoodDiary((items) => items.filter((item) => item.id !== id));
  };

  const saveMeasurements = () => {
    const entry = {
      id: `measurements-${Date.now()}`,
      date: getLocalDateKey(),
      createdAt: new Date().toISOString(),
      waist: Number(measurementForm.waist) || 0,
      hips: Number(measurementForm.hips) || 0,
      chest: Number(measurementForm.chest) || 0,
      arm: Number(measurementForm.arm) || 0,
      leg: Number(measurementForm.leg) || 0,
    };

    if (!MEASUREMENT_FIELDS.some(([key]) => entry[key] > 0)) return;
    setMeasurements((items) => [entry, ...items].slice(0, 30));
    setMeasurementForm({ waist: "", hips: "", chest: "", arm: "", leg: "" });
  };

  const removeMeasurement = (id) => {
    setMeasurements((items) => items.filter((item) => item.id !== id));
  };

  const fillLatestMeasurementForm = () => {
    if (!latestMeasurement) return;

    setMeasurementForm({
      waist: latestMeasurement.waist ? String(latestMeasurement.waist) : "",
      hips: latestMeasurement.hips ? String(latestMeasurement.hips) : "",
      chest: latestMeasurement.chest ? String(latestMeasurement.chest) : "",
      arm: latestMeasurement.arm ? String(latestMeasurement.arm) : "",
      leg: latestMeasurement.leg ? String(latestMeasurement.leg) : "",
    });
  };

  const handleBodyPhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const image = await compressImageFile(file);
      setBodyPhoto(image);
      setBodyAnalysis(null);
      setBodyAnalysisError("");
    } finally {
      event.target.value = "";
    }
  };

  const handleProgressPhotoUpload = async (event, type) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      console.log("[GlowUp AI Food Scan] selected image", {
        source: "file-input",
        target: type,
        file: {
          name: file.name,
          type: file.type,
          bytes: file.size,
          lastModified: file.lastModified,
        },
      });
      const image = await compressImageFile(file);
      console.log("[GlowUp AI Food Scan] image size", {
        source: "compressed-preview",
        target: type,
        chars: image.length,
        approxBytes: Math.round((image.length * 3) / 4),
        startsWithDataImage: image.startsWith("data:image/"),
      });
      if (type === "before") setBeforePhoto(image);
      if (type === "after") setAfterPhoto(image);
      if (type === "food") {
        setFoodPhoto(image);
        setFoodResult(null);
        setFoodAnalysisError("");
        window.requestAnimationFrame(() => analyzeFood(image));
      }
    } catch (error) {
      console.error("[GlowUp AI Food Scan] image selection/compression failed", error);
      if (type === "food") {
        setFoodAnalysisError(`Не вдалося підготувати фото: ${error.message}`);
      }
    } finally {
      event.target.value = "";
    }
  };

  const analyzeBodyPhoto = async () => {
    if (!bodyPhoto) return;

    if (!profile.gender) {
      setShowProfile(true);
      return;
    }

    setBodyAnalysisLoading(true);
    setBodyAnalysisError("");

    try {
      const result = await analyzeBodyImage({
        image: bodyPhoto,
        profile,
      });

      setBodyAnalysis(result);
      setCharlieMessages((messages) => [
        ...messages,
        {
          role: "assistant",
          text: `Я проаналізував фото тіла. Body Score: ${result.bodyScore}/100. ${result.posture}`,
        },
      ]);
    } catch (error) {
      console.error("[GlowUp Body Analysis] fallback used", error);
      const fallback = {
        ...buildBodyAnalysis({
          gender: profile.gender,
          goal: profile.goal,
        }),
        source: "local-fallback",
      };

      setBodyAnalysis(fallback);
      setBodyAnalysisError(
        `AI аналіз фото недоступний. Показано локальну оцінку за профілем. Причина: ${error.message}`
      );
      setCharlieMessages((messages) => [
        ...messages,
        {
          role: "assistant",
          text: `AI аналіз фото зараз недоступний, тому я показав локальну оцінку за профілем. ${fallback.posture}`,
        },
      ]);
    } finally {
      setBodyAnalysisLoading(false);
    }
  };

  const getSpeechLanguage = () =>
    SPEECH_LANGUAGE_CODES[appLanguage] || `${appLanguage}-${appLanguage.toUpperCase()}`;

  const pickCharlieVoice = (languageCode) => {
    if (!window.speechSynthesis) return null;

    const voices = window.speechSynthesis.getVoices();
    const languagePrefix = languageCode.split("-")[0].toLowerCase();
    const languageVoices = voices.filter((voice) =>
      voice.lang.toLowerCase().startsWith(languagePrefix)
    );

    const presetVoiceHints = {
      calm: ["female", "natural", "google", "microsoft"],
      bright: ["female", "zira", "samantha", "google"],
      coach: ["male", "david", "daniel", "microsoft"],
      soft: ["female", "soft", "susan", "google"],
    };

    const hints = presetVoiceHints[voicePreset] || [];
    return (
      languageVoices.find((voice) =>
        hints.some((hint) => voice.name.toLowerCase().includes(hint))
      ) ||
      languageVoices[0] ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ||
      null
    );
  };

  const speak = async (text, { force = false } = {}) => {
    if (!text || (!voiceEnabled && !force)) return;

    const languageCode = getSpeechLanguage();

    try {
      if (hasNativeTts()) {
        const availability = await getNativeTtsAvailability();
        console.log("[GlowUp Charlie TTS] native availability", availability);
        if (!availability.available) {
          throw new Error("\u0423\u0432\u0456\u043c\u043a\u043d\u0438 \u0441\u0438\u043d\u0442\u0435\u0437 \u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f \u0432 \u043d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f\u0445 Android.");
        }

        const result = await speakNativeText({
          text,
          language: languageCode,
          rate: voiceRate,
          pitch: voicePitch,
          preset: voicePreset,
        });
        console.log("[GlowUp Charlie TTS] native speak result", result);
        setVoiceMessage("\u0413\u043e\u043b\u043e\u0441 \u0427\u0430\u0440\u043b\u0456 \u043f\u0440\u0430\u0446\u044e\u0454.");
        return;
      }

      if (!window.speechSynthesis) {
        setVoiceMessage("\u0426\u0435\u0439 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u043d\u0435 \u043f\u0456\u0434\u0442\u0440\u0438\u043c\u0443\u0454 \u0441\u0438\u043d\u0442\u0435\u0437 \u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f.");
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = languageCode;
      const voice = pickCharlieVoice(languageCode);
      if (voice) utterance.voice = voice;
      utterance.rate = voiceRate;
      utterance.pitch = voicePitch;
      window.speechSynthesis.speak(utterance);
      setVoiceMessage("\u0413\u043e\u043b\u043e\u0441 \u0427\u0430\u0440\u043b\u0456 \u043f\u0440\u0430\u0446\u044e\u0454.");
    } catch (error) {
      console.error("Charlie TTS failed", error);
      setVoiceMessage(error.message || "\u0423\u0432\u0456\u043c\u043a\u043d\u0438 \u0441\u0438\u043d\u0442\u0435\u0437 \u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f \u0432 \u043d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f\u0445 Android.");
    }
  };

  const buildCharlieAnswer = (rawQuestion) => {
    const question = rawQuestion.trim().toLowerCase();

    if (!question) {
      return "Я Чарлі. Напиши або скажи питання, і я підкажу наступний маленький крок.";
    }

    if (question.includes("як тебе звати") || question.includes("хто ти")) {
      return "Мене звати Чарлі. Я твій маленький помічник для тіла, настрою, звичок і цілей.";
    }

    if (
      question.includes("план") ||
      question.includes("профіль") ||
      question.includes("що робити") ||
      question.includes("попрацювати")
    ) {
      return `${personalPlan.summary} ${personalPlan.workMore} Перший крок: ${personalPlan.nextSteps[0]}`;
    }

    if (question.includes("схуд") || question.includes("ваг")) {
      return "Для схуднення тримай невеликий дефіцит калорій, сон 7-8 годин і рух щодня. Не карай себе, а будуй систему.";
    }

    if (question.includes("їсти") || question.includes("харч") || question.includes("білок")) {
      return "Склади тарілку просто: білок, овочі, складні вуглеводи і вода. Так легше контролювати голод і калорії.";
    }

    if (question.includes("трен") || question.includes("вправ")) {
      return "Почни з короткого тренування: присідання, планка, віджимання від опори і розтяжка. 15 хвилин краще, ніж нуль.";
    }

    if (
      question.includes("стрес") ||
      question.includes("трив") ||
      question.includes("мент") ||
      question.includes("настр") ||
      question.includes("сум")
    ) {
      return "Зроби паузу на 60 секунд: повільний вдих, довгий видих, плечі вниз. Твоя нервова система не ворог, їй потрібна підтримка.";
    }

    if (
      question.includes("грош") ||
      question.includes("зароб") ||
      question.includes("бізнес") ||
      question.includes("робот")
    ) {
      return "Для заробітку обери одну навичку, яку можна продати, і практикуй її щодня. Потім покажи результат людям, яким це може допомогти.";
    }

    if (question.includes("мотива")) {
      return "Мотивація приходить після дії. Зроби найменший крок зараз, і мозок отримає доказ, що ти рухаєшся.";
    }

    return "Я Чарлі. Можу відповідати про звички, спорт, їжу, ментальне здоров'я, фокус і заробіток.";
  };

  const buildCharlieOfflineAnswer = (rawQuestion) => {
    const baseAnswer = buildCharlieAnswer(rawQuestion);
    const offlineNotes = {
      uk: "Я зараз відповіла в офлайн-режимі GlowUp. Коли AI backend доступний, дам більш персональну відповідь по твоїх даних.",
      en: "I answered in GlowUp offline mode for now. When the AI backend is available, I can make it more personal.",
      pl: "Na razie odpowiadam w trybie offline GlowUp. Gdy backend AI będzie dostępny, odpowiedź będzie bardziej osobista.",
      de: "Ich antworte gerade im GlowUp-Offline-Modus. Wenn das AI-Backend verfügbar ist, wird die Antwort persönlicher.",
      es: "Ahora respondo en modo offline de GlowUp. Cuando el backend de IA esté disponible, la respuesta será más personal.",
      fr: "Je réponds pour l'instant en mode hors ligne GlowUp. Quand le backend IA sera disponible, la réponse sera plus personnalisée.",
      it: "Per ora rispondo in modalità offline GlowUp. Quando il backend AI sarà disponibile, la risposta sarà più personalizzata.",
      pt: "Por enquanto respondo no modo offline do GlowUp. Quando o backend de IA estiver disponível, a resposta será mais personalizada.",
    };

    return `${baseAnswer}\n\n${offlineNotes[appLanguage] || offlineNotes.uk}`;
  };

  const takePhoto = async () => {
    const video = videoRef.current;
    if (!video || !cameraTarget) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photo = compressCanvasToDataUrl(canvas);

    if (cameraTarget === "before") setBeforePhoto(photo);
    if (cameraTarget === "after") setAfterPhoto(photo);
    if (cameraTarget === "food") {
      setFoodPhoto(photo);
      setFoodResult(null);
      setFoodAnalysisError("");
      console.log("[GlowUp AI Food Scan] selected image", {
        source: "camera-canvas",
        imageSize: {
          chars: photo.length,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
        },
      });
      window.requestAnimationFrame(() => analyzeFood(photo));
    }

    setShowQuickActions(false);
    stopCamera();
  };

  const askAI = async (questionOverride = aiQuestion) => {
    const question = questionOverride.trim();
    if (isCharlieThinking) return;

    if (!question) {
      const answer = buildCharlieAnswer(questionOverride);
      setAiAnswer(answer);
      speak(answer);
      return;
    }

    const nextMessages = [...charlieMessages, { role: "user", text: question }];
    setCharlieMessages(nextMessages);
    setAiQuestion("");
    setIsCharlieThinking(true);

    try {
      const result = await askCharlie({
        message: question,
        messages: nextMessages,
        profile,
        language: appLanguage,
        context: charlieCoachContext,
      });
      const answer = result.answer || buildCharlieAnswer(questionOverride);
      setAiAnswer(answer);
      setCharlieMessages((messages) => [
        ...messages,
        { role: "assistant", text: answer },
      ]);
      speak(answer);
    } catch (error) {
      console.error("[GlowUp Charlie] fallback answer used", error);
      const answer = buildCharlieOfflineAnswer(questionOverride);
      setAiAnswer(answer);
      setCharlieMessages((messages) => [
        ...messages,
        { role: "assistant", text: answer },
      ]);
      speak(answer);
    } finally {
      setIsCharlieThinking(false);
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("У цьому браузері голосове введення не підтримується.");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.lang = getSpeechLanguage();
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setAiQuestion(transcript);
      askAI(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleCharlieDragStart = (event) => {
    charlieDragRef.current = {
      offsetX: event.clientX - charliePosition.x,
      offsetY: event.clientY - charliePosition.y,
    };
  };

  const setMotivationThemeChoice = (theme) => {
    setMotivationTheme(theme);
    localStorage.setItem("userTheme", theme);
  };

  const setAppThemeChoice = (theme) => {
    setAppTheme(theme);
    localStorage.setItem("appTheme", theme);
    setSettingsToggles((settings) => ({
      ...settings,
      darkTheme: theme === "night",
    }));
  };

  const saveApiBaseUrl = () => {
    const normalized = normalizeApiBaseUrl(apiBaseUrl);
    setApiBaseUrl(normalized);
    if (normalized) {
      localStorage.setItem(API_BASE_URL_STORAGE_KEY, normalized);
      setApiBaseUrlMessage("API Base URL \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u043e: " + normalized);
    } else {
      localStorage.removeItem(API_BASE_URL_STORAGE_KEY);
      setApiBaseUrlMessage("API Base URL \u043e\u0447\u0438\u0449\u0435\u043d\u043e. Web/PWA \u0432\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u0430\u0454 \u0432\u0456\u0434\u043d\u043e\u0441\u043d\u0438\u0439 /api, Android - fallback URL.");
    }
  };

  const testApiBaseUrl = async () => {
    const normalized = normalizeApiBaseUrl(apiBaseUrl || getConfiguredApiBaseUrl());
    const healthUrl = normalized ? `${normalized}/api/health` : "/api/health";

    setApiBaseUrlMessage("\u041f\u0435\u0440\u0435\u0432\u0456\u0440\u044f\u044e API: " + healthUrl);

    try {
      let status = 0;
      let data = null;

      if (isCapacitorAndroid() && /^https?:\/\//i.test(healthUrl)) {
        const response = await CapacitorHttp.get({
          url: healthUrl,
          headers: { Accept: "application/json" },
          responseType: "json",
        });
        status = response.status;
        data = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
      } else {
        const response = await fetch(healthUrl, { headers: { Accept: "application/json" } });
        status = response.status;
        data = await response.json();
      }

      if (status < 200 || status >= 300 || !data?.ok) {
        throw new Error("API health returned " + status);
      }

      if (normalized) {
        setApiBaseUrl(normalized);
        localStorage.setItem(API_BASE_URL_STORAGE_KEY, normalized);
      }

      setApiBaseUrlMessage(
        data.openAiConfigured
          ? "\u0413\u043e\u0442\u043e\u0432\u043e: API \u043f\u0440\u0430\u0446\u044e\u0454, OpenAI \u043a\u043b\u044e\u0447 \u043d\u0430\u043b\u0430\u0448\u0442\u043e\u0432\u0430\u043d\u0438\u0439. URL \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u043e: " + (normalized || "/api")
          : "API \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u0430\u0454, \u0430\u043b\u0435 OPENAI_API_KEY \u043d\u0435 \u043d\u0430\u043b\u0430\u0448\u0442\u043e\u0432\u0430\u043d\u0438\u0439 \u043d\u0430 backend."
      );
    } catch (error) {
      console.error("[GlowUp API] health check failed", { healthUrl, error });
      setApiBaseUrlMessage("\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u043f\u0456\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u0438\u0441\u044f \u0434\u043e API: " + (error.message || error));
    }
  };
  const refreshGlowUpWidgetStatus = async () => {
    if (!hasNativeWidget()) {
      setWidgetStatus({ native: false, widgetCount: 0, canRequestPin: false });
      return null;
    }

    try {
      const status = await getGlowUpWidgetStatus();
      setWidgetStatus(status);
      return status;
    } catch (error) {
      console.warn("[GlowUp Widget] status failed", error);
      setWidgetMessage("\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u043f\u0435\u0440\u0435\u0432\u0456\u0440\u0438\u0442\u0438 Android widget: " + (error.message || error));
      return null;
    }
  };

  const syncGlowUpWidgetNow = async () => {
    if (!hasNativeWidget()) {
      setWidgetMessage("\u0412\u0456\u0434\u0436\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0438\u0439 \u043b\u0438\u0448\u0435 \u0432 Android \u0434\u043e\u0434\u0430\u0442\u043a\u0443.");
      return;
    }

    try {
      await updateGlowUpWidget({
        waterMl: waterConsumedMl,
        waterGoalMl: waterGoal,
        waterDate: todayWaterKey,
        weightKg: currentWeight ? formatOneDecimal(currentWeight) : "",
        steps,
        activeCalories,
        caloriesConsumed: caloriesTodayTotal,
        dailyCaloriesGoal,
        remainingCalories,
      });
      await refreshGlowUpWidgetStatus();
      setWidgetMessage("\u0412\u0456\u0434\u0436\u0435\u0442 \u0441\u0438\u043d\u0445\u0440\u043e\u043d\u0456\u0437\u043e\u0432\u0430\u043d\u043e.");
    } catch (error) {
      console.warn("[GlowUp Widget] manual sync failed", error);
      setWidgetMessage("\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0441\u0438\u043d\u0445\u0440\u043e\u043d\u0456\u0437\u0443\u0432\u0430\u0442\u0438 \u0432\u0456\u0434\u0436\u0435\u0442: " + (error.message || error));
    }
  };

  const requestGlowUpWidgetPin = async () => {
    if (!hasNativeWidget()) {
      setWidgetMessage("\u0414\u043e\u0434\u0430\u0432\u0430\u043d\u043d\u044f \u0432\u0456\u0434\u0436\u0435\u0442\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0435 \u043b\u0438\u0448\u0435 \u043d\u0430 Android.");
      return;
    }

    try {
      await syncGlowUpWidgetNow();
      const result = await requestPinGlowUpWidget();
      setWidgetMessage(
        result?.requested
          ? "\u0412\u0456\u0434\u043a\u0440\u0438\u0442\u043e Android \u0434\u0456\u0430\u043b\u043e\u0433 \u0434\u043e\u0434\u0430\u0432\u0430\u043d\u043d\u044f \u0432\u0456\u0434\u0436\u0435\u0442\u0430."
          : "\u041b\u0430\u0443\u043d\u0447\u0435\u0440 \u043d\u0435 \u043f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0432 \u0434\u043e\u0434\u0430\u0432\u0430\u043d\u043d\u044f. \u0421\u043f\u0440\u043e\u0431\u0443\u0439 \u0434\u043e\u0434\u0430\u0442\u0438 GlowUp \u0447\u0435\u0440\u0435\u0437 \u043c\u0435\u043d\u044e \u0432\u0456\u0434\u0436\u0435\u0442\u0456\u0432 Android."
      );
      window.setTimeout(refreshGlowUpWidgetStatus, 1200);
    } catch (error) {
      console.warn("[GlowUp Widget] pin failed", error);
      setWidgetMessage("\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0434\u043e\u0434\u0430\u0442\u0438 \u0432\u0456\u0434\u0436\u0435\u0442: " + (error.message || error) + ". \u0421\u043f\u0440\u043e\u0431\u0443\u0439 \u0434\u043e\u0434\u0430\u0442\u0438 GlowUp \u0432\u0440\u0443\u0447\u043d\u0443 \u0437 \u043c\u0435\u043d\u044e \u0432\u0456\u0434\u0436\u0435\u0442\u0456\u0432 Android.");
    }
  };
  const setVoiceEnabledChoice = (enabled) => {
    setVoiceEnabled(enabled);
    localStorage.setItem("voiceEnabled", String(enabled));
    setSettingsToggles((settings) => ({ ...settings, sound: enabled }));
    setVoiceMessage("");
    if (!enabled && hasNativeTts()) {
      stopNativeSpeech().catch(() => {});
    }
    if (!enabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const setVoicePresetChoice = (preset) => {
    const presetConfig = CHARLIE_VOICE_PRESETS[preset] || CHARLIE_VOICE_PRESETS.calm;
    setVoicePreset(preset);
    setVoiceRate(presetConfig.rate);
    setVoicePitch(presetConfig.pitch);
    localStorage.setItem("voicePreset", preset);
    localStorage.setItem("voiceRate", String(presetConfig.rate));
    localStorage.setItem("voicePitch", String(presetConfig.pitch));
  };

  const setVoiceRateChoice = (rate) => {
    setVoiceRate(rate);
    localStorage.setItem("voiceRate", String(rate));
  };

  const setVoicePitchChoice = (pitch) => {
    setVoicePitch(pitch);
    localStorage.setItem("voicePitch", String(pitch));
  };

  const testCharlieVoice = async () => {
    setVoiceMessage("");
    await speak("\u041f\u0440\u0438\u0432\u0456\u0442, \u041d\u0430\u0442\u0430\u043b\u044f! \u042f \u0427\u0430\u0440\u043b\u0456, \u0442\u0432\u0456\u0439 GlowUp \u043f\u043e\u043c\u0456\u0447\u043d\u0438\u043a.", { force: true });
  };

  const requestNotificationPermissionLegacy = () => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      alert("Цей браузер не підтримує сповіщення.");
      return;
    }

    Notification.requestPermission().then((permission) => {
      setNotificationPermission(permission);
      const isGranted = permission === "granted";
      setNotificationsEnabled(isGranted);
      localStorage.setItem("notificationsEnabled", String(isGranted));
      localStorage.setItem("setting-notifications", String(isGranted));
      setSettingsToggles((settings) => ({
        ...settings,
        notifications: isGranted,
      }));

      if (isGranted) {
        new Notification("Сповіщення дозволено", {
          body: "Тепер GlowUp може показувати нагадування.",
        });
      }
    });
  };

  const requestNotificationPermission = () => {
    if (!hasNativeLocalNotifications() && !("Notification" in window)) {
      setNotificationPermission("unsupported");
      if (!isCapacitorAndroid()) {
        alert("Цей браузер не підтримує сповіщення.");
      }
      return;
    }

    requestAppNotificationPermission().then((permission) => {
      setNotificationPermission(permission);
      const isGranted = permission === "granted";
      setNotificationsEnabled(isGranted);
      localStorage.setItem("notificationsEnabled", String(isGranted));
      localStorage.setItem("setting-notifications", String(isGranted));
      setSettingsToggles((settings) => ({
        ...settings,
        notifications: isGranted,
      }));

      if (isGranted) {
        showAppNotification({
          id: 4002,
          title: "Сповіщення дозволено",
          body: "Тепер GlowUp може показувати нагадування.",
        });
      }
    });
  };

  const shareMotivationQuote = () => {
    const textToCopy = `Моя мотивація дня:\n"${motivationData.dailyQuote}"\n\nСерія: ${motivationData.currentStreak} дн. (${getRank(
      motivationData.currentStreak
    )})`;

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => alert("Текст успішно скопійовано."))
      .catch(() => alert("Не вдалося скопіювати текст."));
  };

  const toggleNotificationsLegacy = () => {
    if (!("Notification" in window)) {
      alert("Цей браузер не підтримує сповіщення.");
      return;
    }

    if (Notification.permission === "granted") {
      const nextValue = !notificationsEnabled;
      setNotificationsEnabled(nextValue);
      localStorage.setItem("notificationsEnabled", String(nextValue));
      localStorage.setItem("setting-notifications", String(nextValue));
      setSettingsToggles((settings) => ({
        ...settings,
        notifications: nextValue,
      }));

      if (nextValue) {
        new Notification("Мотивація активована", {
          body: "Нагадування увімкнено. Повертайся завтра за новою фразою.",
        });
      }
      return;
    }

    if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        const isGranted = permission === "granted";
        setNotificationsEnabled(isGranted);
        localStorage.setItem("notificationsEnabled", String(isGranted));
        localStorage.setItem("setting-notifications", String(isGranted));
        setSettingsToggles((settings) => ({
          ...settings,
          notifications: isGranted,
        }));

        if (isGranted) {
          new Notification("Мотивація активована", {
            body: "Нагадування увімкнено. Повертайся завтра за новою фразою.",
          });
        }
      });
      return;
    }

    alert("Сповіщення заблоковані в налаштуваннях браузера.");
  };

  const toggleNotifications = () => {
    if (!hasNativeLocalNotifications() && !("Notification" in window)) {
      setNotificationPermission("unsupported");
      if (!isCapacitorAndroid()) {
        alert("Цей браузер не підтримує сповіщення.");
      }
      return;
    }

    if (notificationPermission === "granted") {
      const nextValue = !notificationsEnabled;
      setNotificationsEnabled(nextValue);
      localStorage.setItem("notificationsEnabled", String(nextValue));
      localStorage.setItem("setting-notifications", String(nextValue));
      setSettingsToggles((settings) => ({
        ...settings,
        notifications: nextValue,
      }));

      if (nextValue) {
        showAppNotification({
          id: 4003,
          title: "Мотивація активована",
          body: "Нагадування увімкнено. Повертайся завтра за новою фразою.",
        });
      }
      return;
    }

    if (notificationPermission !== "denied") {
      requestAppNotificationPermission().then((permission) => {
        const isGranted = permission === "granted";
        setNotificationPermission(permission);
        setNotificationsEnabled(isGranted);
        localStorage.setItem("notificationsEnabled", String(isGranted));
        localStorage.setItem("setting-notifications", String(isGranted));
        setSettingsToggles((settings) => ({
          ...settings,
          notifications: isGranted,
        }));

        if (isGranted) {
          showAppNotification({
            id: 4004,
            title: "Мотивація активована",
            body: "Нагадування увімкнено. Повертайся завтра за новою фразою.",
          });
        }
      });
      return;
    }

    if (!isCapacitorAndroid()) {
      alert("Сповіщення заблоковані в налаштуваннях браузера.");
    }
  };

  const toggleModernSetting = async (key) => {
    const nextValue = !settingsToggles[key];

    if (key === "notifications") {
      if (nextValue) {
        requestNotificationPermission();
      } else {
        setNotificationsEnabled(false);
        localStorage.setItem("notificationsEnabled", "false");
        localStorage.setItem("setting-notifications", "false");
        setSettingsToggles((settings) => ({ ...settings, notifications: false }));
      }
      return;
    }

    if (key === "camera" && nextValue) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        alert("Камеру не відкрито. Дозволь доступ у браузері та спробуй ще раз.");
        return;
      }
    }

    if (key === "darkTheme") {
      setAppThemeChoice(nextValue ? "night" : "glow");
      localStorage.setItem("setting-darkTheme", String(nextValue));
      return;
    }

    if (key === "sound") {
      setVoiceEnabledChoice(nextValue);
      localStorage.setItem("setting-sound", String(nextValue));
      return;
    }

    if (key === "waterReminder" && nextValue) {
      const permission = await getAppNotificationPermission();
      setNotificationPermission(permission);
      if (permission === "default") {
        requestNotificationPermission();
      }
    }

    if (key === "sleepReminder" && nextValue) {
      const permission = await getAppNotificationPermission();
      setNotificationPermission(permission);
      if (permission === "default") {
        requestNotificationPermission();
      }
    }

    if (key === "aiCoach" && !nextValue) {
      setIsCharlieOpen(false);
    }

    if (key === "vibration" && nextValue && navigator.vibrate) {
      navigator.vibrate(35);
    }

    localStorage.setItem(`setting-${key}`, String(nextValue));
    setSettingsToggles((settings) => ({ ...settings, [key]: nextValue }));
  };

  const settingsRows = [
    ["camera", "Камера", "Дозволити камеру для фото їжі та прогресу.", "📷"],
    ["notifications", "Сповіщення", "Системні повідомлення від GlowUp.", "🔔"],
    ["aiCoach", "AI Coach", "Чарлі, персональні відповіді та AI-підказки.", "🤖"],
    ["waterReminder", "Нагадування про воду", "Легкі нагадування пити воду протягом дня.", "💧"],
    ["sleepReminder", "Нагадування лягти спати", "Вечірній сигнал, щоб вчасно підготуватися до сну.", "🌙"],
    ["workoutReminder", "Нагадування про тренування", "Пуш для тренування у вибраний день.", "🏋️"],
    ["photoAccess", "Доступ до фото", "Завантаження фото страв і прогресу.", "🖼"],
    ["darkTheme", "Темна тема", "Глибокий нічний режим GlowUp.", "🌙"],
    ["sound", "Звук", "Голос Чарлі та звукові підказки.", "🔊"],
    ["vibration", "Вібрація", "Короткий tactile feedback для дій.", "📳"],
  ];

  const updateWeeklyWorkoutState = (workout, updater) => {
    const key = `${workoutWeekKey}:${workout.id}`;
    setWeeklyWorkoutLog((log) => {
      const current = log[key] || { completedExercises: [], completed: false };
      const nextState = updater(current);
      const nextLog = { ...log, [key]: nextState };
      localStorage.setItem("weeklyWorkoutLog", JSON.stringify(nextLog));
      return nextLog;
    });
  };

  const toggleWeeklyExercise = (workout, exerciseIndex) => {
    updateWeeklyWorkoutState(workout, (state) => {
      const currentExercises = state.completedExercises || [];
      const completedExercises = currentExercises.includes(exerciseIndex)
        ? currentExercises.filter((index) => index !== exerciseIndex)
        : [...currentExercises, exerciseIndex];

      return {
        ...state,
        completedExercises,
        completed: completedExercises.length === workout.exercises.length,
      };
    });
    if (activeWorkout?.id === workout.id) {
      const nextExercise = Math.min(exerciseIndex + 1, workout.exercises.length - 1);
      const nextActiveWorkout = {
        ...activeWorkout,
        currentExercise: nextExercise,
      };
      setActiveWorkout(nextActiveWorkout);
      localStorage.setItem("activeWorkout", JSON.stringify(nextActiveWorkout));
    }
  };

  const startWeeklyWorkout = (workout, index) => {
    const firstExerciseSeconds = getExerciseDurationSeconds(
      workout.exercises[0],
      workout.difficulty?.timerSeconds || 45
    );

    setSelectedSplitIndex(index);
    setDashboardTab("training");
    setSelectedMinutes(Math.max(1, Math.ceil(firstExerciseSeconds / 60)));
    setSecondsLeft(firstExerciseSeconds);
    setIsTimerRunning(true);
    const nextActiveWorkout = {
      id: workout.id,
      title: workout.title,
      startedAt: new Date().toISOString(),
      currentExercise: 0,
    };
    setActiveWorkout(nextActiveWorkout);
    localStorage.setItem("activeWorkout", JSON.stringify(nextActiveWorkout));
    setWorkoutPlanNotice(`Тренування "${workout.title}" запущено. Натискай вправи по черзі після виконання.`);
    setCharlieMessages((messages) => [
      ...messages,
      {
        role: "assistant",
        text: `Починаємо "${workout.title}". Перша вправа: ${workout.exercises[0]?.name || "розминка"}. Виконуй спокійно, я тримаю таймер.`,
      },
    ]);
    if (settingsToggles.vibration && navigator.vibrate) {
      navigator.vibrate([40, 25, 40]);
    }
  };

  const pauseActiveWorkout = () => {
    setIsTimerRunning(false);
    setWorkoutPlanNotice("Тренування на паузі. Можна продовжити з цієї ж вправи.");
  };

  const resumeActiveWorkout = () => {
    if (!activeWorkout) return;
    if (secondsLeft <= 0) {
      const currentExercise = selectedSplitWorkout.exercises[activeWorkout.currentExercise || 0];
      const currentExerciseSeconds = getExerciseDurationSeconds(
        currentExercise,
        selectedSplitWorkout.difficulty?.timerSeconds || 45
      );

      setSecondsLeft(currentExerciseSeconds);
    }
    setIsTimerRunning(true);
    setWorkoutPlanNotice("Тренування продовжено. Рухаємося далі по плану.");
  };

  const goToNextActiveExercise = (workout) => {
    if (!activeWorkout || activeWorkout.id !== workout.id) {
      startWeeklyWorkout(workout, selectedSplitIndex);
      return;
    }

    const currentIndex = Math.min(
      activeWorkout.currentExercise || 0,
      Math.max(workout.exercises.length - 1, 0)
    );
    const completedIndex = currentIndex;

    updateWeeklyWorkoutState(workout, (state) => {
      const currentExercises = state.completedExercises || [];
      const completedExercises = Array.from(new Set([...currentExercises, completedIndex]));

      return {
        ...state,
        completedExercises,
        completed: completedExercises.length === workout.exercises.length,
      };
    });

    if (currentIndex >= workout.exercises.length - 1) {
      completeWeeklyWorkout(workout);
      return;
    }

    const nextActiveWorkout = {
      ...activeWorkout,
      currentExercise: currentIndex + 1,
      updatedAt: new Date().toISOString(),
    };
    const nextExercise = workout.exercises[currentIndex + 1];
    const nextExerciseSeconds = getExerciseDurationSeconds(
      nextExercise,
      workout.difficulty?.timerSeconds || 45
    );

    setActiveWorkout(nextActiveWorkout);
    localStorage.setItem("activeWorkout", JSON.stringify(nextActiveWorkout));
    setSelectedMinutes(Math.max(1, Math.ceil(nextExerciseSeconds / 60)));
    setSecondsLeft(nextExerciseSeconds);
    setIsTimerRunning(true);

    if (settingsToggles.vibration && navigator.vibrate) {
      navigator.vibrate(35);
    }
  };

  const changeWorkoutDifficulty = (level) => {
    const nextLevel = level || WORKOUT_DIFFICULTY_ORDER[
      (WORKOUT_DIFFICULTY_ORDER.indexOf(workoutDifficulty) + 1) %
        WORKOUT_DIFFICULTY_ORDER.length
    ];
    const nextWorkout = getWorkoutByDifficulty(selectedSplitWorkoutBase, nextLevel, workoutGoal);

    setWorkoutDifficulty(nextLevel);
    localStorage.setItem("workoutDifficulty", nextLevel);
    changeTimerMinutes(nextWorkout.duration);
    setActiveWorkout(null);
    localStorage.removeItem("activeWorkout");
    setWorkoutPlanNotice(
      `Рівень змінено на "${WORKOUT_DIFFICULTY_LEVELS[nextLevel]?.label || nextLevel}". Програма і таймер оновлені.`
    );
  };

  const changeWorkoutGoal = (goal) => {
    const nextGoal = goal || WORKOUT_GOAL_ORDER[
      (WORKOUT_GOAL_ORDER.indexOf(workoutGoal) + 1) % WORKOUT_GOAL_ORDER.length
    ];
    const nextWorkout = getWorkoutByDifficulty(
      selectedSplitWorkoutBase,
      workoutDifficulty,
      nextGoal
    );

    setWorkoutGoal(nextGoal);
    localStorage.setItem("workoutGoal", nextGoal);
    changeTimerMinutes(nextWorkout.duration);
    setActiveWorkout(null);
    localStorage.removeItem("activeWorkout");
    setWorkoutPlanNotice(
      `Ціль змінено на "${WORKOUT_GOAL_CONFIGS[nextGoal]?.label || nextGoal}". Вправи й акценти програми оновлені.`
    );
  };

  const completeWeeklyWorkout = (workout) => {
    const workoutXpKey = `workout-complete:${workoutWeekKey}:${workout.id}`;
    const wasCompleted = Boolean(weeklyWorkoutLog[`${workoutWeekKey}:${workout.id}`]?.completed);

    updateWeeklyWorkoutState(workout, (state) => ({
      ...state,
      completedExercises: workout.exercises.map((_, index) => index),
      completed: true,
      completedAt: new Date().toISOString(),
      completedDate: getLocalDateKey(),
    }));
    setActiveWorkout(null);
    localStorage.removeItem("activeWorkout");

    if (!wasCompleted) {
      const historyEntry = {
        id: `workout-${workoutWeekKey}-${workout.id}`,
        workoutId: workout.id,
        title: workout.title,
        date: getLocalDateKey(),
        completedAt: new Date().toISOString(),
        duration: workout.duration,
        exercises: workout.exercises.length,
        difficulty: workout.difficulty?.label || workoutDifficultyConfig.label,
        goal: workout.goal?.label || workoutGoalConfig.label,
        source: "weekly-workout",
      };
      setWorkoutHistory((items) => {
        const nextItems = [
          historyEntry,
          ...items.filter((item) => item.id !== historyEntry.id),
        ].slice(0, 30);
        localStorage.setItem("workoutHistory", JSON.stringify(nextItems));
        return nextItems;
      });
      awardXp(workoutXpKey, 50, "Тренування виконано");
    }

    setWorkoutStreakAnimation(true);
    window.setTimeout(() => setWorkoutStreakAnimation(false), 1800);
    setCharlieMessages((messages) => [
      ...messages,
      {
        role: "assistant",
        text: `Супер! Тренування "${workout.title}" завершено. Твоя серія стала сильнішою: маленькі перемоги будують великий GlowUp.`,
      },
    ]);

    if (settingsToggles.vibration && navigator.vibrate) {
      navigator.vibrate([45, 35, 45]);
    }
  };

  const addNewMotivationQuote = () => {
    const quote = newMotivationQuote.trim();

    if (!quote) {
      alert("Введи текст фрази.");
      return;
    }

    const nextQuotes = [...motivationData.quotes, quote];
    localStorage.setItem("customQuotes", JSON.stringify(nextQuotes));
    setMotivationData({ ...motivationData, quotes: nextQuotes });
    setNewMotivationQuote("");
    alert(`Додано. Загалом фраз: ${nextQuotes.length}`);
  };

  const addHabit = () => {
    const title = newHabit.trim();

    if (!title) return;

    setHabits([...habits, { title, done: false }]);
    setNewHabit("");
  };

  const toggleHabit = (index) => {
    const selectedHabit = habits[index];
    const nextDone = !selectedHabit?.done;

    setHabits(
      habits.map((habit, habitIndex) =>
        habitIndex === index ? { ...habit, done: !habit.done } : habit
      )
    );

    if (!selectedHabit?.title) return;

    setHabitDailyLog((currentLog) => {
      const todayKey = getLocalDateKey();
      const currentTitles = Array.isArray(currentLog[todayKey])
        ? currentLog[todayKey]
        : completedHabitTitles;
      const nextTitles = nextDone
        ? Array.from(new Set([...currentTitles, selectedHabit.title]))
        : currentTitles.filter((title) => title !== selectedHabit.title);

      return {
        ...currentLog,
        [todayKey]: nextTitles,
      };
    });
  };

  const removeHabit = (index) => {
    const selectedHabit = habits[index];
    if (!selectedHabit?.title) return;

    setHabits((items) => items.filter((_, habitIndex) => habitIndex !== index));
    setHabitDailyLog((currentLog) => {
      const nextLog = Object.fromEntries(
        Object.entries(currentLog).map(([dateKey, titles]) => [
          dateKey,
          Array.isArray(titles)
            ? titles.filter((title) => title !== selectedHabit.title)
            : titles,
        ])
      );

      localStorage.setItem("habitDailyLog", JSON.stringify(nextLog));
      return nextLog;
    });
  };

  const saveCycleTrackerEntry = () => {
    if (!cycleTracker.lastPeriodStart) {
      setCycleMessage("Вибери дату початку останніх місячних.");
      return;
    }

    const normalizedTracker = {
      ...cycleTracker,
      periodLength: Math.max(2, Math.min(10, Number(cycleTracker.periodLength) || 5)),
      cycleLength: Math.max(21, Math.min(45, Number(cycleTracker.cycleLength) || 28)),
      mood: String(cycleTracker.mood || ""),
      painLevel: Math.max(0, Math.min(10, Number(cycleTracker.painLevel) || 0)),
      symptoms: Array.isArray(cycleTracker.symptoms)
        ? cycleTracker.symptoms.filter((symptom) =>
            CYCLE_SYMPTOM_OPTIONS.some((option) => option.value === symptom)
          )
        : [],
      note: String(cycleTracker.note || "").slice(0, 160),
    };

    setCycleTracker(normalizedTracker);
    setCycleHistory((items) => [
      {
        id: Date.now(),
        date: getLocalDateKey(),
        lastPeriodStart: normalizedTracker.lastPeriodStart,
        periodLength: normalizedTracker.periodLength,
        cycleLength: normalizedTracker.cycleLength,
        mood: normalizedTracker.mood,
        painLevel: normalizedTracker.painLevel,
        symptoms: normalizedTracker.symptoms,
        note: normalizedTracker.note,
      },
      ...items.filter((item) => item.lastPeriodStart !== normalizedTracker.lastPeriodStart).slice(0, 11),
    ]);
    setCycleMessage("Цикл оновлено. Прогноз перерахований.");
  };

  const saveWeight = () => {
    const nextWeight = Number(weightInput);

    if (!Number.isFinite(nextWeight) || nextWeight <= 0) return;

    setCurrentWeight(nextWeight);
    setWeightInput("");
  };

  const changeTimerMinutes = (minutes) => {
    setSelectedMinutes(minutes);
    setSecondsLeft(minutes * 60);
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    setSecondsLeft(selectedMinutes * 60);
    setIsTimerRunning(false);
  };

  const getStepsStatusMessage = (status) => {
    if (!status?.native) {
      return "Web/PWA режим: кроки можна вводити вручну.";
    }
    if (!status.permissionGranted) {
      return "Дозволь Physical activity / Activity recognition у налаштуваннях Android.";
    }
    if (!status.hasSensor) {
      return "На цьому телефоні немає системного step counter сенсора. Ручне введення доступне.";
    }
    return `Android step counter доступний${status.sensorName ? `: ${status.sensorName}` : ""}.`;
  };

  const refreshAndroidStepsStatus = async () => {
    try {
      const status = await getAndroidStepsStatus();
      setStepsSensorStatus(status);
      if (!stepsSourceMessage) {
        setStepsSourceMessage(getStepsStatusMessage(status));
      }
      return status;
    } catch (error) {
      console.warn("[GlowUp Steps] status check failed", error);
      const message = error.message || "Не вдалося перевірити Android step counter.";
      setStepsSourceMessage(message);
      return null;
    }
  };

  const syncAndroidSteps = async () => {
    if (!hasNativeStepCounter()) {
      setStepsSensorStatus({
        native: false,
        available: false,
        permissionGranted: false,
        hasSensor: false,
        source: "manual",
      });
      setStepsSourceMessage("Кроки можна вводити вручну у web/PWA режимі.");
      return;
    }

    try {
      const result = await getAndroidTodaySteps();
      if (!result) return;

      const status = await refreshAndroidStepsStatus();
      const nextSteps = Number(result.steps) || 0;
      setSteps(nextSteps);
      setStepsSourceMessage(
        result.initialized && nextSteps === 0
          ? "Крокомір Android підключено. Підрахунок за сьогодні почнеться з цього запуску."
          : `Кроки оновлено з Android step counter${status?.sensorName ? ` (${status.sensorName})` : ""}.`
      );
    } catch (error) {
      console.warn("[GlowUp Steps] native sync failed", error);
      await refreshAndroidStepsStatus();
      setStepsSourceMessage(error.message || "Крокомір Android недоступний. Ручне введення залишається.");
    }
  };

  const calibrateAndroidSteps = async () => {
    if (!hasNativeStepCounter()) {
      setStepsSourceMessage("Калібрування доступне тільки в Android-додатку.");
      return;
    }

    try {
      const result = await resetAndroidStepsBaseline();
      const status = await refreshAndroidStepsStatus();
      setSteps(0);
      setStepsSourceMessage(
        `Крокомір відкалібровано. Поточний Android total: ${
          Number(result?.totalSteps) || Number(status?.lastTotal) || 0
        }. Пройди 20-30 кроків і натисни "Оновити кроки".`
      );
    } catch (error) {
      console.warn("[GlowUp Steps] baseline reset failed", error);
      setStepsSourceMessage(error.message || "Не вдалося відкалібрувати Android step counter.");
    }
  };

  const startNewWorkoutTimer = () => {
    const minutes = getVideoWorkoutMinutes(selectedWorkout, selectedSplitWorkout?.duration || 25);
    setSelectedMinutes(minutes);
    setSecondsLeft(minutes * 60);
    setIsTimerRunning(true);
    setDashboardTab("training");
    setWorkoutPlanNotice(`Вільний таймер запущено для "${selectedWorkout.title}" на ${minutes} хв.`);
  };

  const openNutritionDetails = () => {
    setDashboardTab("nutrition");
  };

  const scrollToSection = (sectionRef) => {
    window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const openFeatureShortcut = (target) => {
    if (target === "water") {
      setDashboardTab("home");
      scrollToSection(waterSectionRef);
      return;
    }

    if (target === "sleep") {
      setDashboardTab("home");
      scrollToSection(sleepSectionRef);
      return;
    }

    if (target === "habits") {
      setDashboardTab("home");
      scrollToSection(habitsSectionRef);
      return;
    }

    if (target === "cycle") {
      setDashboardTab("home");
      scrollToSection(cycleSectionRef);
      return;
    }

    if (target === "progress") {
      setDashboardTab("progress");
      scrollToSection(homeTopRef);
      return;
    }

    setDashboardTab(target);
    scrollToSection(homeTopRef);
  };

  const openFoodVideoLibrary = () => {
    const nextIndex = (selectedFoodVideoIndex + 1) % FOOD_VIDEO_CARDS.length;
    setSelectedFoodVideoIndex(nextIndex);
    setOpenedDish(FOOD_VIDEO_CARDS[nextIndex]);
  };

  const openRecipeLibrary = () => {
    const nextIndex = (selectedRecipeIndex + 1) % RECIPE_CARDS.length;
    setSelectedRecipeIndex(nextIndex);
    setOpenedDish(RECIPE_CARDS[nextIndex]);
  };

  const updateProfileField = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const updateOnboardingField = (field, value) => {
    setOnboardingData((current) => ({ ...current, [field]: value }));
  };

  const toggleOnboardingWorkout = (workout) => {
    setOnboardingData((current) => {
      const trainings = current.trainings || [];
      const nextTrainings = trainings.includes(workout)
        ? trainings.filter((item) => item !== workout)
        : [...trainings, workout];

      return { ...current, trainings: nextTrainings };
    });
  };

  const handleOnboardingPhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const image = await compressImageFile(file);
      setOnboardingData((current) => ({ ...current, bodyPhoto: image }));
      setBodyPhoto(image);
    } finally {
      event.target.value = "";
    }
  };

  const nextOnboardingStep = () => {
    setOnboardingStep((step) => Math.min(step + 1, 7));
  };

  const previousOnboardingStep = () => {
    setOnboardingStep((step) => Math.max(step - 1, 0));
  };

  const finishOnboarding = () => {
    const nextWeight = toNumber(onboardingData.weight, currentWeight || 0);
    const nextProfile = {
      ...profile,
      name: onboardingData.name?.trim() || profile.name || "",
      gender: onboardingData.gender || profile.gender,
      goal: onboardingData.goal || profile.goal,
      weight: nextWeight ? String(nextWeight) : "",
      startWeight: profile.startWeight || (nextWeight ? String(nextWeight) : ""),
      height: onboardingData.height || profile.height,
      age: onboardingData.age || profile.age,
      activity: onboardingData.activity,
      trainings: onboardingData.trainings || [],
    };

    setProfile(nextProfile);
    setCurrentWeight(nextWeight);
    setWaterGlasses(onboardingPlan.water);
    setSteps(0);
    setStepsSourceMessage("План кроків створено. Фактичні кроки підтягнуться з Android або їх можна ввести вручну.");
    if (onboardingData.bodyPhoto) setBodyPhoto(keepLocalPhoto(onboardingData.bodyPhoto));

    localStorage.setItem("userProfile", JSON.stringify(nextProfile));
    localStorage.setItem(
      ONBOARDING_DATA_KEY,
      JSON.stringify({
        ...onboardingData,
        bodyPhoto: keepLocalPhoto(onboardingData.bodyPhoto),
      })
    );
    localStorage.setItem(ONBOARDING_KEY, "true");
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        gender: nextProfile.gender || "",
        weight: nextWeight,
        water: onboardingPlan.water,
        beforePhoto: keepLocalPhoto(beforePhoto) || null,
        afterPhoto: keepLocalPhoto(afterPhoto) || null,
        foodPhoto: null,
        foodName,
        foodResult,
      })
    );

    setDashboardTab("home");
    setOnboardingComplete(true);
  };

  const updateCurrentWeightValue = (value) => {
    const nextWeight = Number(value);

    if (!Number.isFinite(nextWeight) || nextWeight <= 0) return;

    setCurrentWeight(nextWeight);
    setProfile((current) => ({
      ...current,
      weight: String(nextWeight),
      startWeight: current.startWeight || String(nextWeight),
    }));
  };

  const saveProfile = () => {
    const nextWeight = Number(profile.weight);
    const planPreview = buildPersonalPlan({
      profile,
      currentWeight:
        Number.isFinite(nextWeight) && nextWeight > 0 ? nextWeight : currentWeight,
      calories,
      caloriesGoal: getPersonalCaloriesGoal(profile, currentWeight),
      steps,
      stepsGoal,
      waterGlasses: waterGlassesToday,
      waterConsumedMl,
      waterGoal,
      habitProgress,
      completedHabits,
      habitsCount: habits.length,
      selectedMinutes,
    });

    if (Number.isFinite(nextWeight) && nextWeight > 0) {
      setCurrentWeight(nextWeight);
    }

    localStorage.setItem("userProfile", JSON.stringify(profile));
    setDashboardTab("home");
    setCharlieMessages((messages) => [
      ...messages,
      {
        role: "assistant",
        text: `Я підлаштував план під тебе. ${planPreview.summary} ${planPreview.workMore}`,
      },
    ]);
    setShowProfile(false);
  };

  const photoBoxClass =
    "bg-gray-200 rounded-2xl h-40 overflow-hidden flex items-center justify-center text-gray-500";

  if (!onboardingComplete) {
    const stepTitle = [
      "Welcome GlowUp",
      "Яка твоя головна ціль?",
      "Обери стать",
      "Дані для персонального плану",
      "Рівень активності",
      "Які тренування тобі підходять?",
      "Фото тіла",
      "Твій GlowUp план готовий",
    ][onboardingStep];
    const stepProgress = Math.round(((onboardingStep + 1) / 8) * 100);
    const onboardingTips = [
      "Порада: заповни тільки те, що знаєш зараз. План можна змінити пізніше.",
      "Ціль потрібна, щоб GlowUp правильно підсвітив тренування, калорії та прогрес.",
      "Стать використовується тільки для персоналізації порад і плану.",
      "Дані допомагають порахувати орієнтир калорій, води та кроків.",
      "Рівень активності краще вибрати чесно, не ідеально.",
      "Можна обрати кілька форматів тренувань, щоб план був зручним.",
      "Фото необов'язкове. Його можна додати пізніше у прогресі.",
      "Це beta-план: почни з малого, а GlowUp буде підлаштовуватися під твої записи.",
    ];

    return (
      <div
        className={`theme-${appTheme} min-h-screen bg-[#08071a] p-4 text-white md:p-6`}
        style={dashboardThemeStyle}
      >
        <div className="mx-auto flex min-h-[calc(100vh-32px)] max-w-3xl items-center">
          <div className="w-full overflow-hidden rounded-3xl border border-white/10 bg-[#15122d]/95 shadow-2xl backdrop-blur">
            <div className="border-b border-white/10 p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pink-300">
                    GlowUp onboarding
                  </p>
                  <h1 className="mt-2 text-3xl font-black">{stepTitle}</h1>
                </div>
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 text-2xl">
                  ✦
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all"
                  style={{ width: `${stepProgress}%` }}
                />
              </div>
              <p className="mt-2 text-right text-xs text-white/45">
                {onboardingStep + 1} / 8
              </p>
              <div className="tip-card mt-4 p-3 text-sm leading-relaxed text-white/70">
                {onboardingTips[onboardingStep]}
              </div>
            </div>

            <div className="p-5 md:p-7">
              {onboardingStep === 0 && (
                <div className="space-y-5 text-center">
                  <div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-pink-500 to-purple-500 text-5xl shadow-xl shadow-pink-500/20">
                    ✦
                  </div>
                  <div>
                    <h2 className="text-4xl font-black">Welcome GlowUp</h2>
                    <p className="mx-auto mt-4 max-w-xl text-white/65">
                      Зараз я швидко зберу твою ціль, дані, активність і формат
                      тренувань, а потім відкрию персональний dashboard.
                    </p>
                  </div>
                </div>
              )}

              {onboardingStep === 1 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {ONBOARDING_GOALS.map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => updateOnboardingField("goal", goal)}
                      className={`rounded-2xl border p-5 text-left font-bold transition ${
                        onboardingData.goal === goal
                          ? "border-pink-400 bg-pink-500/20 text-white"
                          : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
                      }`}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              )}

              {onboardingStep === 2 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["female", "Жінка", "Фокус на талії, сідницях, ногах, поставі та стабільності."],
                    ["male", "Чоловік", "Фокус на силі, плечах, грудях, м'язах і відсотку жиру."],
                  ].map(([value, label, text]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateOnboardingField("gender", value)}
                      className={`rounded-2xl border p-5 text-left transition ${
                        onboardingData.gender === value
                          ? "border-pink-400 bg-pink-500/20"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <p className="text-xl font-black">{label}</p>
                      <p className="mt-2 text-sm text-white/60">{text}</p>
                    </button>
                  ))}
                </div>
              )}

              {onboardingStep === 3 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-sm font-semibold text-white/60">
                      Ім'я
                    </span>
                    <input
                      type="text"
                      value={onboardingData.name || ""}
                      onChange={(event) =>
                        updateOnboardingField("name", event.target.value)
                      }
                      placeholder="Як тебе звати?"
                      className="w-full rounded-2xl border border-white/10 bg-[#2a2542] p-4 text-white outline-none placeholder:text-white/35 focus:border-pink-400"
                    />
                  </label>
                  {[
                    ["weight", "Вага, кг", "68"],
                    ["height", "Зріст, см", "170"],
                    ["age", "Вік", "22"],
                  ].map(([field, placeholder, fallback]) => (
                    <label key={field} className="block">
                      <span className="mb-2 block text-sm font-semibold text-white/60">
                        {placeholder}
                      </span>
                      <input
                        type="number"
                        value={onboardingData[field] || ""}
                        onChange={(event) =>
                          updateOnboardingField(field, event.target.value)
                        }
                        placeholder={fallback}
                        className="w-full rounded-2xl border border-white/10 bg-[#2a2542] p-4 text-white outline-none placeholder:text-white/35 focus:border-pink-400"
                      />
                    </label>
                  ))}
                </div>
              )}

              {onboardingStep === 4 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {ONBOARDING_ACTIVITIES.map((activity) => (
                    <button
                      key={activity.key}
                      type="button"
                      onClick={() => updateOnboardingField("activity", activity.key)}
                      className={`rounded-2xl border p-5 text-left transition ${
                        onboardingData.activity === activity.key
                          ? "border-pink-400 bg-pink-500/20"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <p className="text-lg font-black">{activity.label}</p>
                      <p className="mt-2 text-sm text-white/55">
                        Орієнтир: {activity.steps.toLocaleString("uk-UA")} кроків,
                        {` ${activity.water}`} скл. води
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {onboardingStep === 5 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {ONBOARDING_WORKOUTS.map((workout) => (
                    <button
                      key={workout}
                      type="button"
                      onClick={() => toggleOnboardingWorkout(workout)}
                      className={`rounded-2xl border p-5 text-left font-bold transition ${
                        onboardingData.trainings?.includes(workout)
                          ? "border-pink-400 bg-pink-500/20"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      {workout}
                    </button>
                  ))}
                </div>
              )}

              {onboardingStep === 6 && (
                <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-2xl bg-white/5 p-5">
                    <h2 className="text-xl font-black">Фото тіла</h2>
                    <p className="mt-2 text-sm text-white/60">
                      Можеш додати стартове фото для майбутнього порівняння.
                      Цей крок можна пропустити.
                    </p>
                    <label className="mt-5 block cursor-pointer rounded-2xl border border-dashed border-pink-400/40 bg-white/5 p-5 text-center font-bold transition hover:bg-white/10">
                      Завантажити фото
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleOnboardingPhotoUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={nextOnboardingStep}
                      className="mt-3 w-full rounded-2xl bg-white/10 p-4 font-bold text-white/70"
                    >
                      Пропустити
                    </button>
                  </div>

                  <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-white/45">
                    {onboardingData.bodyPhoto ? (
                      <img
                        src={onboardingData.bodyPhoto}
                        alt="Стартове фото тіла"
                        className="h-full max-h-[360px] w-full object-cover"
                      />
                    ) : (
                      "Фото ще не додано"
                    )}
                  </div>
                </div>
              )}

              {onboardingStep === 7 && (
                <div className="space-y-5">
                  <div className="rounded-3xl bg-gradient-to-r from-pink-500 to-purple-600 p-6">
                    <p className="text-sm opacity-80">AI створив твій GlowUp план</p>
                    <h2 className="mt-2 text-3xl font-black">Починаємо красиво</h2>
                    <p className="mt-3 text-white/80">
                      План буде збережено в профілі та відкриється головна програма.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["Калорії", `${onboardingPlan.calories} ккал/день`, "🔥"],
                      ["Вода", `${onboardingPlan.water} склянок`, "💧"],
                      ["Кроки", `${onboardingPlan.steps.toLocaleString("uk-UA")} / день`, "👟"],
                      ["Тренування", onboardingPlan.training, "🏋️"],
                    ].map(([label, value, icon]) => (
                      <div key={label} className="rounded-2xl bg-white/5 p-5">
                        <p className="text-3xl">{icon}</p>
                        <p className="mt-3 text-sm text-white/50">{label}</p>
                        <p className="mt-1 text-xl font-black">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/10 p-5">
              <button
                type="button"
                onClick={previousOnboardingStep}
                disabled={onboardingStep === 0}
                className="rounded-2xl bg-white/10 px-5 py-3 font-bold text-white/70 disabled:opacity-30"
              >
                Назад
              </button>
              {onboardingStep === 7 ? (
                <button
                  type="button"
                  onClick={finishOnboarding}
                  className="rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 font-black text-white shadow-lg shadow-pink-500/20"
                >
                  Почати свій GlowUp
                </button>
              ) : (
                <button
                  type="button"
                  onClick={nextOnboardingStep}
                  className="rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 font-black text-white shadow-lg shadow-pink-500/20"
                >
                  Далі
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div
        className={`theme-${appTheme} min-h-screen bg-[#08071a] p-3 text-white md:p-5`}
        style={dashboardThemeStyle}
      >
        <style>{`
          .theme-ocean .bg-\\[\\#171430\\],
          .theme-ocean .bg-\\[\\#11102a\\],
          .theme-ocean .bg-\\[\\#15122d\\] { background-color: rgba(8, 47, 73, 0.88) !important; }
          .theme-ocean .text-purple-300 { color: #67e8f9 !important; }
          .theme-night .bg-\\[\\#171430\\],
          .theme-night .bg-\\[\\#11102a\\],
          .theme-night .bg-\\[\\#15122d\\] { background-color: rgba(15, 23, 42, 0.9) !important; }
          .theme-forest .bg-\\[\\#171430\\],
          .theme-forest .bg-\\[\\#11102a\\],
          .theme-forest .bg-\\[\\#15122d\\] { background-color: rgba(6, 78, 59, 0.88) !important; }
          .theme-forest .text-purple-300 { color: #86efac !important; }
        `}</style>
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="tap-anim fixed right-4 top-4 z-50 rounded-xl border border-white/10 bg-[#171430]/90 px-3 py-2 text-xs font-bold text-white shadow-xl backdrop-blur hover:-translate-y-0.5 hover:bg-white/10"
          aria-label="Відкрити налаштування"
          title="Налаштування"
        >
          ⚙
        </button>
        <button
          type="button"
          onClick={() => setShowProfile(true)}
          className="tap-anim fixed right-4 top-16 z-50 grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-[#171430]/90 text-white shadow-xl backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/10"
          aria-label="Відкрити профіль"
          title="Профіль"
        >
          <span className="grid gap-1">
            <span className="block h-0.5 w-5 rounded-full bg-white" />
            <span className="block h-0.5 w-5 rounded-full bg-white" />
            <span className="block h-0.5 w-5 rounded-full bg-white" />
          </span>
        </button>

        {workoutStreakAnimation && (
          <div className="toast-pop fixed left-1/2 top-6 z-[90] -translate-x-1/2 rounded-3xl border border-orange-300/40 bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-4 text-center font-black text-white shadow-2xl shadow-pink-500/40">
            🔥 Серія росте! Тренування завершено
          </div>
        )}

        {levelUpMessage && (
          <div className="toast-pop fixed left-1/2 top-24 z-[95] -translate-x-1/2 rounded-3xl border border-pink-300/40 bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 text-center font-black text-white shadow-2xl shadow-pink-500/40">
            ✨ {levelUpMessage}
          </div>
        )}

        {achievementMessage && (
          <div className="badge-pop fixed left-1/2 top-44 z-[95] -translate-x-1/2 rounded-3xl border border-yellow-300/40 bg-gradient-to-r from-yellow-400 to-pink-500 px-6 py-4 text-center font-black text-slate-950 shadow-2xl shadow-yellow-500/30">
            🏆 {achievementMessage}
          </div>
        )}

        {challengeMessage && (
          <div className="badge-pop fixed left-1/2 top-64 z-[95] -translate-x-1/2 rounded-3xl border border-cyan-300/40 bg-gradient-to-r from-cyan-300 to-purple-500 px-6 py-4 text-center font-black text-white shadow-2xl shadow-cyan-500/30">
            🚀 {challengeMessage}
          </div>
        )}

        {isSettingsOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 sm:items-center"
            onClick={() => setIsSettingsOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Налаштування GlowUp"
          >
            <div
              className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-[#15122d] p-5 text-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black">{t("settings")}</h2>
                  <p className="text-sm text-white/60">{t("settingsSubtitle")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="h-10 w-10 rounded-full bg-white/10 text-xl"
                  aria-label="Закрити налаштування"
                >
                  x
                </button>
              </div>

              <div className="space-y-4">
                <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-pink-950/20 backdrop-blur">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-orange-400 text-xl shadow-lg shadow-pink-500/25">
                      🌐
                    </span>
                    <div>
                      <h3 className="font-bold">{t("language")}</h3>
                      <p className="text-xs text-white/45">{t("languageNote")}</p>
                    </div>
                  </div>
                  <select
                    value={appLanguage}
                    onChange={(event) => setAppLanguage(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#0b1022] p-3 text-white outline-none transition focus:border-pink-400"
                  >
                    {APP_LANGUAGES.map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                </section>

                {showApiSettings && (
                <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-cyan-950/20">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-xl shadow-lg shadow-cyan-500/20">
                      API
                    </span>
                    <div>
                      <h3 className="font-bold">AI API</h3>
                      <p className="text-xs text-white/45">
                        {"\u0412\u0441\u0442\u0430\u0432 HTTPS URL production backend, \u0449\u043e\u0431 AI \u043f\u0440\u0430\u0446\u044e\u0432\u0430\u0432 \u043d\u0435 \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e."}
                      </p>
                    </div>
                  </div>
                  <input
                    type="url"
                    inputMode="url"
                    value={apiBaseUrl}
                    onChange={(event) => {
                      setApiBaseUrl(event.target.value);
                      setApiBaseUrlMessage("");
                    }}
                    placeholder="https://glowup-fitness-api.onrender.com"
                    className="w-full rounded-2xl border border-white/10 bg-[#0b1022] p-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300"
                  />
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={saveApiBaseUrl}
                      className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 p-3 font-bold text-white shadow-lg shadow-cyan-500/20"
                    >
                      {"\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438 URL"}
                    </button>
                    <button
                      type="button"
                      onClick={testApiBaseUrl}
                      className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-3 font-bold text-cyan-50 transition hover:bg-cyan-300/15"
                    >
                      {"\u041f\u0435\u0440\u0435\u0432\u0456\u0440\u0438\u0442\u0438 API"}
                    </button>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-white/45">
                    {"\u041f\u0440\u0438\u043a\u043b\u0430\u0434: https://your-render-service.onrender.com. \u041f\u0435\u0440\u0435\u0432\u0456\u0440\u043a\u0430 \u043c\u0430\u0454 \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u0438, \u0449\u043e backend \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0438\u0439 \u0456 OPENAI_API_KEY \u043d\u0430\u043b\u0430\u0448\u0442\u043e\u0432\u0430\u043d\u0438\u0439."}
                  </p>
                  {apiBaseUrlMessage && (
                    <p className="mt-3 rounded-2xl bg-cyan-400/10 p-3 text-sm text-cyan-100">
                      {apiBaseUrlMessage}
                    </p>
                  )}
                </section>
                )}
                <section className="rounded-[28px] border border-white/10 bg-[#0b1022]/80 p-3 shadow-xl shadow-pink-950/20">
                  <div className="px-2 pb-2 pt-1">
                    <h3 className="text-lg font-black">Дозволи та комфорт</h3>
                    <p className="text-xs text-white/45">
                      Швидке керування функціями GlowUp.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {settingsRows.map(([key, label, description, icon]) => {
                      const isActive = Boolean(settingsToggles[key]);

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleModernSetting(key)}
                          className="group flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.055] p-3 text-left transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.08]"
                        >
                          <span
                            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl transition duration-300 ${
                              isActive
                                ? "bg-gradient-to-br from-pink-500 to-orange-400 shadow-lg shadow-pink-500/25"
                                : "bg-slate-800 text-white/55"
                            }`}
                          >
                            {icon}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block font-bold text-white">{label}</span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-white/45">
                              {description}
                            </span>
                          </span>

                          <span
                            className={`relative h-8 w-14 shrink-0 rounded-full p-1 transition-all duration-300 ${
                              isActive
                                ? "bg-gradient-to-r from-pink-500 to-orange-400 shadow-lg shadow-pink-500/30"
                                : "bg-slate-700"
                            }`}
                          >
                            <span
                              className={`block h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
                                isActive ? "translate-x-6" : "translate-x-0"
                              }`}
                            />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-cyan-950/20">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">Нагадування про воду</h3>
                      <p className="mt-1 text-xs text-white/45">
                        Обери інтервал, а GlowUp нагадає випити воду, якщо браузер дозволяє сповіщення.
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        settingsToggles.waterReminder
                          ? "bg-cyan-400 text-slate-950"
                          : "bg-slate-700 text-white/60"
                      }`}
                    >
                      {settingsToggles.waterReminder ? "ON" : "OFF"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ["1", "1 год"],
                      ["2", "2 год"],
                      ["3", "3 год"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setWaterReminderInterval(value)}
                        className={`rounded-2xl border p-3 text-sm font-bold transition ${
                          waterReminderInterval === value
                            ? "border-cyan-300 bg-cyan-400/20 text-cyan-100 shadow-lg shadow-cyan-500/10"
                            : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {notificationPermission === "denied" && isCapacitorAndroid() && (
                    <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-100">
                      Сповіщення заблоковані в Android. Відкрий налаштування застосунку GlowUp і дозволь Notifications.
                    </div>
                  )}

                  {notificationPermission === "denied" && !isCapacitorAndroid() && (
                    <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-100">
                      Сповіщення заблоковані у браузері. Натисни на іконку замочка біля адреси сайту та дозволь Notification.
                    </div>
                  )}

                  {notificationPermission === "default" && settingsToggles.waterReminder && (
                    <button
                      type="button"
                      onClick={requestNotificationPermission}
                      className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 p-3 font-bold text-white shadow-lg shadow-cyan-500/20"
                    >
                      Дозволити сповіщення для нагадувань
                    </button>
                  )}

                  {notificationPermission === "granted" && (
                    <p className="mt-4 rounded-2xl bg-emerald-400/10 p-3 text-sm text-emerald-100">
                      Сповіщення дозволені. Нагадування працюватиме, коли перемикач води увімкнений.
                    </p>
                  )}
                </section>

                <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-indigo-950/20">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">Нагадування про сон</h3>
                      <p className="mt-1 text-xs text-white/45">
                        Вибери час, коли GlowUp нагадає підготуватися до сну.
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        settingsToggles.sleepReminder
                          ? "bg-indigo-300 text-slate-950"
                          : "bg-slate-700 text-white/60"
                      }`}
                    >
                      {settingsToggles.sleepReminder ? "ON" : "OFF"}
                    </span>
                  </div>

                  <label className="block text-sm font-semibold text-white/60">
                    Час нагадування
                    <input
                      type="time"
                      value={bedtimeReminderTime}
                      onChange={(event) => setBedtimeReminderTime(event.target.value)}
                      onInput={(event) => setBedtimeReminderTime(event.currentTarget.value)}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0b1022] p-3 text-white outline-none transition focus:border-indigo-300"
                    />
                  </label>

                  {notificationPermission === "denied" && isCapacitorAndroid() && (
                    <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-100">
                      Сповіщення заблоковані в Android. Відкрий налаштування застосунку GlowUp і дозволь Notifications.
                    </div>
                  )}

                  {notificationPermission === "denied" && !isCapacitorAndroid() && (
                    <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-100">
                      Сповіщення заблоковані у браузері. Дозволь Notification біля адреси сайту, щоб нагадування про сон працювало.
                    </div>
                  )}

                  {notificationPermission === "default" && settingsToggles.sleepReminder && (
                    <button
                      type="button"
                      onClick={requestNotificationPermission}
                      className="mt-4 w-full rounded-2xl bg-gradient-to-r from-indigo-400 to-purple-500 p-3 font-bold text-white shadow-lg shadow-indigo-500/20"
                    >
                      Дозволити сповіщення для сну
                    </button>
                  )}
                </section>

                <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-pink-950/20">
                  <h3 className="mb-3 font-bold">{t("appDesign")}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(APP_THEMES).map(([key, theme]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAppThemeChoice(key)}
                        className={`rounded-2xl border p-3 text-left font-semibold transition ${
                          appTheme === key
                            ? "border-pink-400 bg-pink-500/20 text-pink-100 shadow-lg shadow-pink-500/20"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <span
                          className={`mb-2 block h-8 rounded-xl bg-gradient-to-r ${theme.accent}`}
                        />
                        {theme.name}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-cyan-300/15 bg-white/[0.06] p-4 shadow-xl shadow-cyan-950/20">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold">Android widget</h3>
                      <p className="mt-1 text-xs leading-relaxed text-white/45">
                        {"\u0412\u043e\u0434\u0430, \u0432\u0430\u0433\u0430, \u043a\u0440\u043e\u043a\u0438 \u0456 \u0448\u0432\u0438\u0434\u043a\u0435 +250 \u043c\u043b \u043d\u0430 \u0434\u043e\u043c\u0430\u0448\u043d\u044c\u043e\u043c\u0443 \u0435\u043a\u0440\u0430\u043d\u0456."}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-cyan-300/15 px-3 py-1 text-xs font-bold text-cyan-100">
                      {widgetStatus?.widgetCount || 0} {"\u0430\u043a\u0442."}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={requestGlowUpWidgetPin}
                      disabled={!hasNativeWidget() || widgetStatus?.canRequestPin === false}
                      className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 p-3 font-bold text-white shadow-lg shadow-cyan-500/20 transition disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {"\u0414\u043e\u0434\u0430\u0442\u0438 \u0432\u0456\u0434\u0436\u0435\u0442"}
                    </button>
                    <button
                      type="button"
                      onClick={syncGlowUpWidgetNow}
                      disabled={!hasNativeWidget()}
                      className="rounded-2xl border border-white/10 bg-white/10 p-3 font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {"\u0421\u0438\u043d\u0445\u0440\u043e\u043d\u0456\u0437\u0443\u0432\u0430\u0442\u0438"}
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-white/65">
                    <span className="rounded-2xl bg-white/5 p-3">
                      {hasNativeWidget() ? "Android" : "Web/PWA"}
                    </span>
                    <span className="rounded-2xl bg-white/5 p-3">
                      {widgetStatus?.canRequestPin
                        ? "\u041c\u043e\u0436\u043d\u0430 \u0434\u043e\u0434\u0430\u0442\u0438"
                        : "\u0420\u0443\u0447\u043d\u0435 \u0434\u043e\u0434\u0430\u0432\u0430\u043d\u043d\u044f"}
                    </span>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-white/45">
                    {"\u041a\u043d\u043e\u043f\u043a\u0430 +250 \u043c\u043b \u0443 \u0432\u0456\u0434\u0436\u0435\u0442\u0456 \u043e\u043d\u043e\u0432\u043b\u044e\u0454 \u0432\u043e\u0434\u0443, \u0430 GlowUp \u043f\u0456\u0434\u0442\u044f\u0433\u043d\u0435 \u0446\u0435 \u043f\u0456\u0441\u043b\u044f \u0432\u0456\u0434\u043a\u0440\u0438\u0442\u0442\u044f \u0430\u0431\u043e \u043f\u043e\u0432\u0435\u0440\u043d\u0435\u043d\u043d\u044f \u0432 \u0434\u043e\u0434\u0430\u0442\u043e\u043a."}
                  </p>
                  {widgetMessage && (
                    <p className="mt-3 rounded-2xl bg-cyan-400/10 p-3 text-sm leading-relaxed text-cyan-50">
                      {widgetMessage}
                    </p>
                  )}
                </section>
                <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-pink-950/20">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{t("charlieSound")}</h3>
                      <p className="text-xs text-white/45">
                        Обери характер голосу Чарлі.
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        voiceEnabled ? "bg-pink-500 text-white" : "bg-slate-700 text-white/60"
                      }`}
                    >
                      {voiceEnabled ? "ON" : "OFF"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVoiceEnabledChoice(!voiceEnabled)}
                    className={`mb-3 w-full rounded-2xl p-3 font-bold transition ${
                      voiceEnabled
                        ? "bg-pink-500 text-white"
                        : "bg-white/10 text-white/60 hover:bg-white/15"
                    }`}
                  >
                    {voiceEnabled ? "Голос увімкнено" : "Голос вимкнено"}
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(CHARLIE_VOICE_PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setVoicePresetChoice(key)}
                        className={`rounded-2xl border p-3 text-left text-sm font-semibold transition ${
                          voicePreset === key
                            ? "border-orange-300 bg-gradient-to-r from-pink-500/25 to-orange-400/20 text-white"
                            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-3">
                    <label className="text-sm font-semibold text-white/70">
                      {"\u0428\u0432\u0438\u0434\u043a\u0456\u0441\u0442\u044c \u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f"}: {voiceRate.toFixed(2)}
                      <input
                        type="range"
                        min="0.6"
                        max="1.4"
                        step="0.05"
                        value={voiceRate}
                        onChange={(event) => setVoiceRateChoice(Number(event.target.value))}
                        className="mt-2 w-full accent-pink-500"
                      />
                    </label>
                    <label className="text-sm font-semibold text-white/70">
                      Pitch: {voicePitch.toFixed(2)}
                      <input
                        type="range"
                        min="0.6"
                        max="1.4"
                        step="0.05"
                        value={voicePitch}
                        onChange={(event) => setVoicePitchChoice(Number(event.target.value))}
                        className="mt-2 w-full accent-orange-400"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={testCharlieVoice}
                    className="mt-3 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 p-3 font-bold text-white shadow-lg shadow-pink-500/25 transition hover:scale-[1.01]"
                  >
                    {"\u0422\u0435\u0441\u0442 \u0433\u043e\u043b\u043e\u0441\u0443"}
                  </button>
                  {voiceMessage && (
                    <p className="mt-3 rounded-2xl bg-rose-500/15 p-3 text-sm text-rose-100">
                      {voiceMessage}
                    </p>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}

        {showProfile && (
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-3 sm:items-center"
            onClick={() => setShowProfile(false)}
          >
            <div
              className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-[#15122d] p-5 text-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black">Мій профіль</h2>
                  <p className="text-sm text-white/60">
                    Дані для персонального плану GlowUp
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfile(false)}
                  className="h-10 w-10 rounded-full bg-white/10 text-xl text-white"
                >
                  x
                </button>
              </div>

              <input
                value={profile.name}
                onChange={(event) => updateProfileField("name", event.target.value)}
                placeholder="Ім'я"
                className="mb-3 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white outline-none placeholder:text-white/45 focus:border-pink-400"
              />

              <select
                value={profile.gender || ""}
                onChange={(event) => updateProfileField("gender", event.target.value)}
                className="mb-3 w-full rounded-xl border border-white/10 bg-[#2a2542] p-3 text-white outline-none focus:border-pink-400"
              >
                <option className="bg-[#15122d] text-white" value="">Оберіть стать</option>
                <option className="bg-[#15122d] text-white" value="female">Жінка</option>
                <option className="bg-[#15122d] text-white" value="male">Чоловік</option>
              </select>

              <input
                value={profile.age}
                onChange={(event) => updateProfileField("age", event.target.value)}
                placeholder="Вік"
                type="number"
                className="mb-3 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white outline-none placeholder:text-white/45 focus:border-pink-400"
              />

              <input
                value={profile.height}
                onChange={(event) => updateProfileField("height", event.target.value)}
                placeholder="Зріст, см"
                type="number"
                className="mb-3 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white outline-none placeholder:text-white/45 focus:border-pink-400"
              />

              <input
                value={profile.startWeight || ""}
                onChange={(event) => updateProfileField("startWeight", event.target.value)}
                placeholder="Стартова вага, кг"
                type="number"
                className="mb-3 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white outline-none placeholder:text-white/45 focus:border-pink-400"
              />

              <input
                value={profile.weight}
                onChange={(event) => updateProfileField("weight", event.target.value)}
                placeholder="Вага зараз, кг"
                type="number"
                className="mb-3 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white outline-none placeholder:text-white/45 focus:border-pink-400"
              />

              <input
                value={profile.goalWeight}
                onChange={(event) => updateProfileField("goalWeight", event.target.value)}
                placeholder="Бажана вага, кг"
                type="number"
                className="mb-3 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white outline-none placeholder:text-white/45 focus:border-pink-400"
              />

              <select
                value={profile.goal}
                onChange={(event) => updateProfileField("goal", event.target.value)}
                className="mb-3 w-full rounded-xl border border-white/10 bg-[#2a2542] p-3 text-white outline-none focus:border-pink-400"
              >
                <option className="bg-[#15122d] text-white">Схуднути</option>
                <option className="bg-[#15122d] text-white">Підтягнути тіло</option>
                <option className="bg-[#15122d] text-white">Набрати м'язи</option>
                <option className="bg-[#15122d] text-white">Виправити поставу</option>
                <option className="bg-[#15122d] text-white">Покращити здоров'я</option>
              </select>

              <div className="mb-4 rounded-2xl border border-purple-400/20 bg-white/5 p-4 text-sm">
                <p className="font-bold text-pink-200">Після збереження</p>
                <p className="mt-1 leading-relaxed text-white/70">
                  {personalPlan.hasProfileData
                    ? `GlowUp поставить орієнтир близько ${caloriesGoal} ккал і підкаже, над чим працювати: ${personalPlan.workMore}`
                    : "GlowUp створить персональний план після того, як ти заповниш зріст, вагу і бажану вагу."}
                </p>
              </div>

              <button
                onClick={saveProfile}
                className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 p-3 font-semibold text-white shadow-lg shadow-pink-500/20"
              >
                Зберегти
              </button>

              <button
                onClick={() => setShowProfile(false)}
                className="mt-2 w-full rounded-xl p-3 text-white/60 transition hover:bg-white/5"
              >
                Закрити
              </button>
            </div>
          </div>
        )}

        {cameraStream && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
            onClick={stopCamera}
          >
            <div
              className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#15122d] p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    {cameraTarget === "food"
                      ? "Камера їжі"
                      : cameraTarget === "before"
                        ? "Фото ДО"
                        : "Фото ПІСЛЯ"}
                  </h2>
                  <p className="text-sm text-white/55">
                    {cameraTarget === "food"
                      ? "Зроби фото, і GlowUp покаже страву, склад та калорії."
                      : "Зроби фото прогресу, щоб порівнювати зміни тіла з часом."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="h-10 w-10 rounded-full bg-white/10 text-xl"
                >
                  x
                </button>
              </div>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-h-[62vh] w-full rounded-2xl bg-black object-cover"
              />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={takePhoto}
                  className="rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 p-4 font-bold"
                >
                  Зробити фото
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="rounded-2xl bg-white/10 p-4 font-bold"
                >
                  Скасувати
                </button>
              </div>
            </div>
          </div>
        )}

        <input
          ref={cameraFallbackInputRef}
          type="file"
          accept="image/*"
          capture={cameraFallbackTarget === "food" ? "environment" : "user"}
          onChange={(event) => handleProgressPhotoUpload(event, cameraFallbackTarget)}
          className="hidden"
        />

        <AIFoodScanResult
          foodResult={foodResult}
          foodPhoto={foodPhoto}
          foodAnalysisError={foodAnalysisError}
          foodAnalysisLoading={foodAnalysisLoading}
          onAddToDiary={addFoodResultToDiary}
          onCloseResult={() => {
            setFoodResult(null);
            setFoodPhoto("");
          }}
          onCloseError={() => setFoodAnalysisError("")}
          onRetry={() => analyzeFood()}
        />

        {openedDish && (
          <div
            className="fixed inset-0 z-[75] flex items-end justify-center bg-black/70 p-3 sm:items-center"
            onClick={() => setOpenedDish(null)}
          >
            <div
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#15122d] text-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative">
                <img
                  src={openedDish.image}
                  alt={openedDish.title}
                  className="h-64 w-full rounded-t-3xl object-cover"
                />
                <button
                  type="button"
                  onClick={() => setOpenedDish(null)}
                  className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-xl"
                >
                  x
                </button>
              </div>

              <div className="p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black">{openedDish.title}</h2>
                    <p className="mt-1 text-pink-300">
                      {openedDish.calories || "корисна страва"}
                      {openedDish.time ? ` • ${openedDish.time}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCalories((value) => value + (Number.parseInt(openedDish.calories, 10) || 0));
                      setOpenedDish(null);
                    }}
                    className="rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-3 font-bold"
                  >
                    Додати калорії
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <section className="rounded-2xl bg-white/5 p-4">
                    <h3 className="mb-3 font-bold">Склад</h3>
                    <ul className="space-y-2 text-sm text-white/80">
                      {(openedDish.ingredients || []).map((ingredient) => (
                        <li key={ingredient} className="flex gap-2">
                          <span className="text-pink-300">•</span>
                          <span>{ingredient}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="rounded-2xl bg-white/5 p-4">
                    <h3 className="mb-3 font-bold">Як приготувати</h3>
                    <ol className="space-y-3 text-sm text-white/80">
                      {(openedDish.steps || []).map((step, index) => (
                        <li key={step} className="flex gap-3">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pink-500 text-xs font-bold">
                            {index + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
              </div>
            </div>
          </div>
        )}

        {openedWorkout && (
          <div
            className="fixed inset-0 z-[75] flex items-end justify-center bg-black/75 p-3 sm:items-center"
            onClick={() => setOpenedWorkout(null)}
          >
            <div
              className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#15122d] text-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
                <div>
                  <h2 className="text-xl font-black">{openedWorkout.title}</h2>
                  <p className="mt-1 text-sm text-white/55">{openedWorkout.meta}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenedWorkout(null)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-xl"
                >
                  x
                </button>
              </div>
              <div className="aspect-video bg-black">
                <iframe
                  className="h-full w-full"
                  src={openedWorkout.videoUrl}
                  title={openedWorkout.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-3">
                {WORKOUT_CARDS.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setOpenedWorkout(item)}
                    className={`rounded-2xl border p-3 text-left text-sm transition ${
                      openedWorkout.title === item.title
                        ? "border-pink-400 bg-pink-500/15"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <p className="font-bold">{item.title}</p>
                    <p className="mt-1 text-white/50">{item.time}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {settingsToggles.aiCoach && (
          <button
            type="button"
            onPointerDown={handleCharlieDragStart}
            onClick={() => setIsCharlieOpen((value) => !value)}
            className="fixed z-50 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-white/20 bg-gradient-to-br from-slate-900 via-purple-700 to-pink-500 shadow-2xl"
            style={{ left: `${charliePosition.x}px`, top: `${charliePosition.y}px` }}
            title="Чарлі"
          >
            <span className="relative block h-7 w-8 rounded-xl bg-white shadow-inner">
              <span className="absolute -top-1.5 left-1/2 h-1.5 w-1 -translate-x-1/2 rounded-full bg-white" />
              <span className="absolute -top-2.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-pink-300" />
              <span className="absolute left-1.5 top-2.5 h-2 w-2 rounded-full bg-purple-600" />
              <span className="absolute right-1.5 top-2.5 h-2 w-2 rounded-full bg-purple-600" />
              <span className="absolute bottom-1.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-slate-800" />
            </span>
          </button>
        )}

        {settingsToggles.aiCoach && isCharlieOpen && (
          <div
            className="fixed inset-x-3 z-50 mx-auto flex max-h-[min(58vh,520px)] w-auto max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#15122d] shadow-2xl"
            style={{ bottom: "calc(122px + env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
              <div>
                <h2 className="font-bold">Чарлі</h2>
                <p className="text-xs text-white/50">AI Coach</p>
              </div>
              <button onClick={() => setIsCharlieOpen(false)} className="rounded-full bg-white/10 px-3 py-1">
                x
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
              {charlieMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-[82%] rounded-2xl bg-pink-500 px-4 py-3"
                      : "mr-auto max-w-[88%] rounded-2xl bg-white/10 px-4 py-3 text-white/90"
                  }
                >
                  {message.text}
                </div>
              ))}
            </div>
            <div className="shrink-0 border-t border-white/10 bg-[#15122d] p-3">
              <div className="flex gap-2 rounded-2xl bg-white/10 p-2">
                <input
                  value={aiQuestion}
                  onChange={(event) => setAiQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") askAI();
                  }}
                  placeholder="Напиши своє питання..."
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-white outline-none placeholder:text-white/45"
                />
                <button
                  onClick={() => askAI()}
                  disabled={isCharlieThinking}
                  className="rounded-xl bg-pink-500 px-4 font-bold disabled:opacity-60"
                >
                  {isCharlieThinking ? "..." : "➤"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto grid w-full max-w-[1280px] min-w-0 gap-5 overflow-x-hidden lg:grid-cols-[250px_1fr]">
          <aside className="hidden rounded-3xl border border-white/10 bg-[#11102a] p-6 shadow-2xl lg:flex lg:min-h-[calc(100vh-40px)] lg:flex-col">
            <div className="mb-10 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 text-2xl">
                ✦
              </div>
              <h1 className="text-3xl font-semibold">GlowUp</h1>
            </div>

            <nav className="space-y-2 text-white/85">
              {[
                t("home"),
                t("progress"),
                t("nutrition"),
                t("training"),
                t("habits"),
                "AI Coach",
                t("video"),
                t("recipes"),
                t("settings"),
              ].map((item, index) => (
                <button
                  key={item}
                  onClick={() => {
                    if (index === 8) setIsSettingsOpen(true);
                    if (index === 0) setDashboardTab("home");
                    if (index === 1) setDashboardTab("progress");
                    if (index === 2) setDashboardTab("nutrition");
                    if (index === 3) setDashboardTab("training");
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left ${
                    (index === 0 && dashboardTab === "home") ||
                    (index === 1 && dashboardTab === "progress") ||
                    (index === 2 && dashboardTab === "nutrition") ||
                    (index === 3 && dashboardTab === "training")
                      ? "bg-gradient-to-r from-pink-500/50 to-purple-500/40 text-white"
                      : "hover:bg-white/10"
                  }`}
                >
                  <span className="text-xl">
                    {["⌂", "▥", "◍", "⌁", "♡", "✧", "▻", "✿", "⚙"][index]}
                  </span>
                  {item}
                </button>
              ))}
            </nav>

            <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-3 font-bold">Мотивація дня ✨</h3>
              <p className="text-sm leading-relaxed text-white/80">
                {dailyMotivation || currentMotivation.text}
              </p>
              <div className="mt-4 text-right text-2xl text-pink-400">♥</div>
            </div>

            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className="mt-6 flex w-full items-center gap-3 rounded-2xl text-left transition hover:bg-white/5"
            >
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face"
                alt={profileName}
                className="h-12 w-12 rounded-full object-cover"
              />
              <div>
                <p className="font-bold">{profileName}</p>
                <p className="text-sm text-white/50">Рівень {glowUpLevel.level}</p>
              </div>
            </button>
            <div className="mt-3 h-2 rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
                style={{ width: `${glowUpLevel.progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-white/60">
              {glowUpLevel.currentLevelXp} / {glowUpLevel.nextLevelXp} XP · всього {totalXp} XP
            </p>
          </aside>

          <main ref={homeTopRef} className="app-main-content min-w-0 space-y-5 overflow-x-hidden">
            <header className="glow-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Привіт, {profileName}! 👋</h2>
                  <p className="mt-2 text-white/65">
                    {t("greetingSub")} 💖
                  </p>
                </div>
                <div className="relative text-3xl">
                  ♧
                  <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-pink-500 text-xs">
                    3
                  </span>
                </div>
              </div>
            </header>

            {dashboardTab === "home" && (
            <section className="glow-card p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pink-300">
                    Персональний план
                  </p>
                  <h3 className="mt-2 text-2xl font-black">
                    GlowUp підлаштувався під твої дані
                  </h3>
                  <p className="mt-3 max-w-3xl text-white/70">{personalPlan.summary}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfile(true)}
                  className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  Змінити дані
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-white/50">Що важливо зараз</p>
                  <p className="mt-2 text-lg font-bold text-pink-200">
                    {personalPlan.workMore}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-white/65">
                    {personalPlan.bmiText}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-white/65">
                    {personalPlan.targetText}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {personalPlan.focusAreas.map((area) => (
                    <div key={area.title} className="rounded-2xl bg-white/5 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-xl">{area.icon}</span>
                        <h4 className="font-bold">{area.title}</h4>
                      </div>
                      <p className="text-sm leading-relaxed text-white/65">{area.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-gradient-to-r from-pink-500/15 to-purple-500/15 p-4">
                <h4 className="mb-3 font-bold">План на сьогодні</h4>
                <div className="grid gap-3 md:grid-cols-3">
                  {personalPlan.nextSteps.map((step, index) => (
                    <div key={step} className="flex gap-3 text-sm text-white/75">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pink-500 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            )}

            {dashboardTab === "home" && (
              <section className="glow-card overflow-hidden p-5 sm:p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200/70">Центр функцій</p>
                    <h3 className="mt-1 text-2xl font-black text-white">Швидкий доступ</h3>
                    <p className="mt-2 text-sm text-white/55">Усі важливі трекери в одному місці, без довгого пошуку по сторінці.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {featureShortcuts.map((item) => (
                    <button
                      key={item.target}
                      type="button"
                      onClick={() => openFeatureShortcut(item.target)}
                      className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.055] p-3 text-left transition hover:-translate-y-0.5 hover:bg-white/10"
                    >
                      <span className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${item.accent} text-xs font-black text-white shadow-lg`}>
                        {item.icon}
                      </span>
                      <span className="mt-3 block truncate text-sm font-bold text-white">{item.label}</span>
                      <span className="mt-1 block truncate text-lg font-black text-white">{item.value}</span>
                      <span className="mt-1 block truncate text-xs text-white/45">{item.detail}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <div className="rounded-3xl bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white shadow-lg">
              <p className="text-sm opacity-80">Мотивація дня</p>
              <h2 className="mt-2 text-xl font-bold">🔥 Твій знак сьогодні</h2>
              <p className="mt-3 text-lg leading-relaxed">{dailyMotivation}</p>
            </div>

            <div key={dashboardTab} className="tab-panel">
            {dashboardTab === "progress" ? (
              <section className="space-y-5">
                <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-7">
                  <h3 className="text-2xl font-bold">{t("progressStats")}</h3>
                  <p className="mt-2 text-white/60">
                    {t("progressText")}
                  </p>
                </div>

                <section className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-4 shadow-xl shadow-pink-950/20 sm:p-6">
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold uppercase tracking-[0.16em] text-pink-300">{"\u0417\u0430\u043c\u0456\u0440\u0438"}</p>
                      <h3 className="mt-2 text-2xl font-black">{"\u0422\u0440\u0435\u043a\u0435\u0440 \u0437\u0430\u043c\u0456\u0440\u0456\u0432 \u0442\u0456\u043b\u0430"}</h3>
                      <p className="mt-2 text-sm text-white/55">
                        {"\u0422\u0430\u043b\u0456\u044f, \u0441\u0442\u0435\u0433\u043d\u0430, \u0433\u0440\u0443\u0434\u0438, \u0440\u0443\u043a\u0430 \u0456 \u043d\u043e\u0433\u0430. GlowUp \u043f\u043e\u043a\u0430\u0436\u0435 \u0431\u0443\u043b\u043e / \u0441\u0442\u0430\u043b\u043e \u0456 \u0434\u0438\u043d\u0430\u043c\u0456\u043a\u0443."}
                      </p>
                    </div>
                    {latestMeasurement && (
                      <button
                        type="button"
                        onClick={fillLatestMeasurementForm}
                        className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15"
                      >
                        {"\u0412\u043d\u0435\u0441\u0442\u0438 \u043e\u0441\u0442\u0430\u043d\u043d\u0456"}
                      </button>
                    )}
                  </div>

                  {measurements.length > 0 && (
                    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      {measurementSummary.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setMeasurementMetric(item.key)}
                          className={`rounded-2xl border p-3 text-left transition ${
                            measurementMetric === item.key
                              ? "border-pink-300 bg-pink-500/20"
                              : "border-white/10 bg-white/[0.055] hover:bg-white/10"
                          }`}
                        >
                          <p className="text-xs text-white/45">{item.label}</p>
                          <p className="mt-1 text-2xl font-black">
                            {item.latest || "-"}{item.latest ? <span className="text-xs text-white/40"> {"\u0441\u043c"}</span> : null}
                          </p>
                          {item.trend !== "empty" && (
                            <p className={`mt-1 text-xs font-bold ${item.delta <= 0 ? "text-emerald-200" : "text-pink-200"}`}>
                              {item.delta > 0 ? "+" : ""}{item.delta} {"\u0441\u043c"}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                    <div className="min-w-0">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-2">
                        {MEASUREMENT_FIELDS.map(([key, label]) => (
                          <label key={key} className="block min-w-0 text-sm font-semibold text-white/65">
                            {label}
                            <div className="mt-2 flex min-w-0 items-center rounded-2xl border border-white/10 bg-white/5 px-3 focus-within:border-pink-400">
                              <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                value={measurementForm[key]}
                                onChange={(event) =>
                                  setMeasurementForm((form) => ({
                                    ...form,
                                    [key]: event.target.value,
                                  }))
                                }
                                className="min-w-0 flex-1 bg-transparent py-3 text-white outline-none placeholder:text-white/30"
                                placeholder="0"
                              />
                              <span className="shrink-0 text-xs font-bold text-white/40">{"\u0441\u043c"}</span>
                            </div>
                          </label>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={saveMeasurements}
                        disabled={!MEASUREMENT_FIELDS.some(([key]) => Number(measurementForm[key]) > 0)}
                        className="mt-4 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 p-3 font-black text-white shadow-lg shadow-pink-500/20 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:text-white/45"
                      >
                        {"\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438 \u0437\u0430\u043c\u0456\u0440\u0438"}
                      </button>
                    </div>

                    <div className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.055] p-4">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-white/45">{"\u0413\u0440\u0430\u0444\u0456\u043a \u0437\u043c\u0456\u043d"}</p>
                          <h4 className="text-xl font-black">{selectedMeasurementLabel}</h4>
                        </div>
                        {measurementChartData.entries.length > 0 && (
                          <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
                            <p className="text-xs text-white/45">{"\u0417\u043c\u0456\u043d\u0430"}</p>
                            <p className={`text-lg font-black ${measurementChartData.delta <= 0 ? "text-emerald-200" : "text-pink-200"}`}>
                              {measurementChartData.delta > 0 ? "+" : ""}{measurementChartData.delta} {"\u0441\u043c"}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mb-4 flex flex-wrap gap-2">
                        {MEASUREMENT_FIELDS.map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setMeasurementMetric(key)}
                            className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                              measurementMetric === key
                                ? "bg-pink-500 text-white"
                                : "bg-white/10 text-white/60 hover:bg-white/15"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div className="h-52 overflow-hidden rounded-2xl bg-[#0b1022] p-3">
                        {measurementChartData.points ? (
                          <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="measurementGradient" x1="0" x2="1" y1="0" y2="0">
                                <stop offset="0%" stopColor="#ec4899" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                              </linearGradient>
                            </defs>
                            {[25, 50, 75].map((line) => (
                              <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="rgba(255,255,255,0.08)" strokeWidth="0.7" />
                            ))}
                            <polyline points={measurementChartData.points} fill="none" stroke="url(#measurementGradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
                            {measurementChartData.entries.map((entry, index) => {
                              const point = measurementChartData.points.split(" ")[index];
                              const [cx, cy] = point.split(",");
                              return <circle key={entry.id} cx={cx} cy={cy} r="2.8" fill="#ffffff" stroke="#ec4899" strokeWidth="1.2" />;
                            })}
                          </svg>
                        ) : (
                          <div className="grid h-full place-items-center text-center text-sm text-white/45">
                            {"\u0414\u043e\u0434\u0430\u0439 \u043f\u0435\u0440\u0448\u0456 \u0437\u0430\u043c\u0456\u0440\u0438, \u0456 \u0442\u0443\u0442 \u0437'\u044f\u0432\u0438\u0442\u044c\u0441\u044f \u0433\u0440\u0430\u0444\u0456\u043a."}
                          </div>
                        )}
                      </div>

                      {measurementChartData.entries.length > 0 && (
                        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                          <div className="rounded-2xl bg-white/5 p-3">
                            <p className="text-xs text-white/45">{"\u0411\u0443\u043b\u043e"}</p>
                            <p className="mt-1 font-black">{measurementChartData.first} {"\u0441\u043c"}</p>
                          </div>
                          <div className="rounded-2xl bg-white/5 p-3">
                            <p className="text-xs text-white/45">{"\u0421\u0442\u0430\u043b\u043e"}</p>
                            <p className="mt-1 font-black">{measurementChartData.latest} {"\u0441\u043c"}</p>
                          </div>
                          <div className="rounded-2xl bg-white/5 p-3">
                            <p className="text-xs text-white/45">{"\u0414\u0456\u0430\u043f\u0430\u0437\u043e\u043d"}</p>
                            <p className="mt-1 font-black">{measurementChartData.min}-{measurementChartData.max}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {measurements.length > 0 && (
                    <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-black">{"\u0406\u0441\u0442\u043e\u0440\u0456\u044f \u0437\u0430\u043c\u0456\u0440\u0456\u0432"}</h4>
                          <p className="text-xs text-white/45">{"\u041e\u0441\u0442\u0430\u043d\u043d\u0456 \u0437\u0430\u043f\u0438\u0441\u0438, \u043d\u0430\u0439\u043d\u043e\u0432\u0456\u0448\u0456 \u0437\u0432\u0435\u0440\u0445\u0443"}</p>
                        </div>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/60">{measurements.length}/30</span>
                      </div>

                      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                        {measurements.map((entry) => (
                          <div key={entry.id} className="grid gap-3 rounded-2xl bg-white/5 p-3 text-sm text-white/70 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                            <div className="font-bold text-white">{entry.date}</div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                              {MEASUREMENT_FIELDS.map(([key, label]) => (
                                <div key={key} className="min-w-0">
                                  <span className="block text-[11px] text-white/35">{label}</span>
                                  <span className="font-bold text-white">{entry[key] || "-"}{entry[key] ? " ??" : ""}</span>
                                </div>
                              ))}
                            </div>
                            <button type="button" onClick={() => removeMeasurement(entry.id)} className="rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-100 transition hover:bg-rose-500/25">
                              {"\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
                  {[
                    ["\u041a\u0440\u043e\u043a\u0438", steps.toLocaleString("uk-UA"), `${stepsProgress}% \u0432\u0456\u0434 \u0446\u0456\u043b\u0456`, "??", stepsProgress],
                    ["\u0414\u0438\u0441\u0442\u0430\u043d\u0446\u0456\u044f", `${stepsDistanceKm} \u043a\u043c`, "\u041f\u0440\u0438\u0431\u043b\u0438\u0437\u043d\u043e \u0437\u0430 \u0441\u044c\u043e\u0433\u043e\u0434\u043d\u0456", "??", stepsProgress],
                    ["\u0421\u0435\u0440\u0435\u0434\u043d\u0454", stepsAverage7Days.toLocaleString("uk-UA"), `${stepsAverageDistanceKm} \u043a\u043c / \u0434\u0435\u043d\u044c`, "??", Math.min(Math.round((stepsAverage7Days / stepsGoal) * 100), 100)],
                    ["\u041d\u0430\u0439\u043a\u0440\u0430\u0449\u0438\u0439 \u0434\u0435\u043d\u044c", stepsBest7Days.toLocaleString("uk-UA"), "\u0437\u0430 \u043e\u0441\u0442\u0430\u043d\u043d\u0456 7 \u0434\u043d\u0456\u0432", "??", Math.min(Math.round((stepsBest7Days / stepsGoal) * 100), 100)],
                    ["\u0412\u043e\u0434\u0430", `${waterConsumedMl} \u043c\u043b`, `${waterConsumedMl} / ${waterGoal} \u043c\u043b`, "??", waterProgress],
                  ].map(([title, value, subtitle, icon, progress]) => (
                    <div key={title} className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-6">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-3xl">{icon}</span>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/70">
                          {progress}%
                        </span>
                      </div>
                      <p className="text-white/55">{title}</p>
                      <p className="mt-2 text-3xl font-black">{value}</p>
                      <p className="mt-1 text-sm text-white/55">{subtitle}</p>
                      <div className="mt-5 h-3 rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.055] p-4 text-sm text-white/70">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200/70">{"\u0417\u0432\u0456\u0442 \u0440\u0443\u0445\u0443"}</p>
                      <h3 className="mt-1 text-2xl font-black text-white">{"\u041a\u0440\u043e\u043a\u0438 \u0437\u0430 7 \u0434\u043d\u0456\u0432"}</h3>
                      <p className="mt-2 break-words text-white/60">
                        {"\u0421\u044c\u043e\u0433\u043e\u0434\u043d\u0456 \u0442\u0438 \u043f\u0440\u043e\u0439\u0448\u043b\u0430 "}{steps.toLocaleString("uk-UA")}{" \u043a\u0440\u043e\u043a\u0456\u0432, \u043f\u0440\u0438\u0431\u043b\u0438\u0437\u043d\u043e "}{stepsDistanceKm}{" \u043a\u043c."}
                      </p>
                    </div>
                    <span className="w-fit shrink-0 rounded-2xl bg-emerald-400/15 px-3 py-2 text-xs font-bold text-emerald-100">
                      {stepsSensorStatus?.available ? "Android step counter" : "Manual / fallback"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="min-w-0 rounded-2xl bg-white/5 p-3">
                      <p className="text-xs text-white/45">{"\u0421\u0435\u0440\u0435\u0434\u043d\u0454 / \u0434\u0435\u043d\u044c"}</p>
                      <p className="mt-1 text-xl font-black text-white">{stepsAverage7Days.toLocaleString("uk-UA")}</p>
                      <p className="text-xs text-white/45">{stepsAverageDistanceKm}{" \u043a\u043c"}</p>
                    </div>
                    <div className="min-w-0 rounded-2xl bg-white/5 p-3">
                      <p className="text-xs text-white/45">{"\u0426\u0456\u043b\u044c \u0432\u0438\u043a\u043e\u043d\u0430\u043d\u0430"}</p>
                      <p className="mt-1 text-xl font-black text-white">{stepsGoalDays7Days}{"/7 \u0434\u043d\u0456\u0432"}</p>
                      <p className="text-xs text-white/45">{stepsGoal.toLocaleString("uk-UA")}{" \u043a\u0440\u043e\u043a\u0456\u0432"}</p>
                    </div>
                    <div className="min-w-0 rounded-2xl bg-white/5 p-3">
                      <p className="text-xs text-white/45">{"\u041d\u0430\u0439\u043a\u0440\u0430\u0449\u0438\u0439 \u0434\u0435\u043d\u044c"}</p>
                      <p className="mt-1 text-xl font-black text-white">{stepsBest7Days.toLocaleString("uk-UA")}</p>
                      <p className="text-xs text-white/45">{formatOneDecimal((stepsBest7Days * stepStrideMeters) / 1000)}{" \u043a\u043c"}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-3xl bg-[#111026] p-3">
                    <div className="flex h-32 items-end gap-2 overflow-hidden">
                      {stepsLast7Days.map((value, index) => {
                        const progress = Math.min(100, Math.round((value / stepsChartMax) * 100));
                        const isGoalDay = value >= stepsGoal;
                        const isToday = index === stepsLast7Days.length - 1;

                        return (
                          <div key={`${progressChartSeries.labels[index]}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                            <div className="flex h-24 w-full max-w-9 items-end rounded-full bg-white/10 p-1">
                              <div
                                className={`w-full rounded-full ${isGoalDay ? "bg-gradient-to-t from-emerald-400 to-cyan-300" : "bg-gradient-to-t from-pink-500 to-orange-400"}`}
                                style={{ height: `${Math.max(progress, value > 0 ? 10 : 4)}%` }}
                              />
                            </div>
                            <span className={`truncate text-[11px] font-bold ${isToday ? "text-white" : "text-white/45"}`}>
                              {progressChartSeries.labels[index]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/45">
                      <span>{"\u041f\u043e\u043c\u0430\u0440\u0430\u043d\u0447\u0435\u0432\u0435 - \u0434\u0435\u043d\u044c \u0449\u0435 \u043d\u0435 \u0434\u043e\u0442\u044f\u0433\u043d\u0443\u0432 \u0434\u043e \u0446\u0456\u043b\u0456"}</span>
                      <span>{"\u0411\u0456\u0440\u044e\u0437\u043e\u0432\u0435 - \u0446\u0456\u043b\u044c \u0432\u0438\u043a\u043e\u043d\u0430\u043d\u0430"}</span>
                    </div>
                  </div>

                  <details className="mt-3 rounded-2xl bg-white/5 p-3">
                    <summary className="cursor-pointer text-xs font-bold text-white/60">
                      {"\u0414\u0456\u0430\u0433\u043d\u043e\u0441\u0442\u0438\u043a\u0430 \u043a\u0440\u043e\u043a\u043e\u043c\u0456\u0440\u0430"}
                    </summary>
                    <div className="mt-3 space-y-3">
                      <p className="break-words">{stepsSourceMessage || "\u041a\u0440\u043e\u043a\u0438 \u043e\u043d\u043e\u0432\u043b\u044e\u044e\u0442\u044c\u0441\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u043d\u043e \u0437 Android."}</p>
                      {stepsSensorStatus?.native && (
                        <div className="flex flex-wrap gap-2 text-xs font-bold">
                          <span className={`rounded-full px-2 py-1 ${stepsSensorStatus.permissionGranted ? "bg-emerald-400/15 text-emerald-100" : "bg-rose-400/15 text-rose-100"}`}>
                            Permission: {stepsSensorStatus.permissionState || "unknown"}
                          </span>
                          <span className={`rounded-full px-2 py-1 ${stepsSensorStatus.hasSensor ? "bg-cyan-400/15 text-cyan-100" : "bg-yellow-400/15 text-yellow-100"}`}>
                            Sensor: {stepsSensorStatus.hasSensor ? "available" : "missing"}
                          </span>
                          <span className="rounded-full bg-white/10 px-2 py-1 text-white/70">
                            Total: {Number(stepsSensorStatus.lastTotal) || 0}
                          </span>
                          <span className="rounded-full bg-white/10 px-2 py-1 text-white/70">
                            Baseline: {Number(stepsSensorStatus.baseline) || 0}
                          </span>
                        </div>
                      )}
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={syncAndroidSteps}
                          className="rounded-2xl bg-white/10 px-4 py-2 font-bold text-white transition hover:bg-white/15"
                        >
                          {"\u041e\u043d\u043e\u0432\u0438\u0442\u0438 \u043a\u0440\u043e\u043a\u0438"}
                        </button>
                        {stepsSensorStatus?.native && (
                          <button
                            type="button"
                            onClick={calibrateAndroidSteps}
                            className="rounded-2xl bg-pink-500/20 px-4 py-2 font-bold text-pink-100 transition hover:bg-pink-500/30"
                          >
                            {"\u041a\u0430\u043b\u0456\u0431\u0440\u0443\u0432\u0430\u0442\u0438"}
                          </button>
                        )}
                      </div>
                    </div>
                  </details>
                </div>

                <GlowUpLevelCard glowUpLevel={glowUpLevel} totalXp={totalXp} compact />

                <ChallengesSection
                  challengeCards={challengeCards}
                  onStartChallenge={startChallenge}
                />

                <AchievementsSection achievementCards={achievementCards} />

                <section className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 shadow-xl sm:p-6 shadow-pink-950/20">
                  <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.16em] text-pink-300">
                        Аналітика прогресу
                      </p>
                      <h3 className="mt-2 text-2xl font-black">
                        GlowUp Score: {progressAnalytics.glowUpScore}/100
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
                        Аналіз за останні 7 днів з foodDiary, water logs, sleep logs і weeklyWorkoutLog.
                      </p>
                    </div>
                    <div className="relative mx-auto grid h-36 w-36 place-items-center rounded-full bg-[conic-gradient(#ec4899_0_var(--score),rgba(255,255,255,0.1)_var(--score)_100%)] p-3 [--score:0%] xl:mx-0"
                      style={{ "--score": `${progressAnalytics.glowUpScore}%` }}
                    >
                      <div className="grid h-full w-full place-items-center rounded-full bg-[#171430] text-center">
                        <div>
                          <p className="text-4xl font-black">{progressAnalytics.glowUpScore}</p>
                          <p className="text-xs text-white/45">із 100</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {progressAnalytics.cards.map((card) => (
                      <div
                        key={card.title}
                        className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 shadow-lg shadow-black/10"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <span className="text-3xl">{card.icon}</span>
                          <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-white/75">
                            {card.percent}%
                          </span>
                        </div>
                        <p className="text-sm text-white/50">{card.title}</p>
                        <p className="mt-2 text-3xl font-black">{card.value}</p>
                        <p className="mt-1 text-sm text-white/45">{card.subtitle}</p>
                        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${card.accent} transition-all duration-500`}
                            style={{ width: `${card.percent}%` }}
                          />
                        </div>
                        <p className="mt-4 text-sm leading-relaxed text-white/60">
                          {card.advice}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                    <div className="rounded-3xl border border-pink-400/20 bg-gradient-to-r from-pink-500/15 to-purple-500/10 p-5">
                      <p className="text-sm font-bold text-pink-200">Порада за даними прогресу</p>
                      <p className="mt-2 text-sm leading-relaxed text-white/75">
                        {progressAnalytics.aiTip}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        ["Nutrition consistency", `${progressAnalytics.nutritionConsistency}%`],
                        ["Water consistency", `${progressAnalytics.waterConsistency}%`],
                        ["Sleep consistency", `${progressAnalytics.sleepConsistency}%`],
                        ["Workout streak", `${progressAnalytics.workoutStreak} дн.`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl bg-white/5 p-4">
                          <p className="text-white/45">{label}</p>
                          <p className="mt-1 text-xl font-black">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-6">
                    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold">AI фотоаналіз тіла</h3>
                        <p className="mt-1 text-sm text-white/55">
                          Body Score, постава і вправи під твою ціль.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowProfile(true)}
                        className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white/70"
                      >
                        Профіль
                      </button>
                    </div>

                    <div className="mb-4 rounded-2xl bg-white/5 p-4 text-sm text-white/75">
                      {profile.gender === "female" ? (
                        <p>
                          Програма враховує жіноче тіло: талію, ноги, сідниці,
                          поставу, воду і зміни ваги.
                        </p>
                      ) : profile.gender === "male" ? (
                        <p>
                          Програма враховує чоловіче тіло: плечі, груди, силу,
                          м'язи і відсоток жиру.
                        </p>
                      ) : (
                        <p>
                          Обери стать у профілі, щоб фотоаналіз став персональнішим.
                        </p>
                      )}
                    </div>

                    <label className="block cursor-pointer rounded-2xl border border-dashed border-pink-400/40 bg-white/5 p-4 text-center transition hover:bg-white/10">
                      <span className="font-bold">Завантажити фото тіла</span>
                      <span className="mt-1 block text-sm text-white/50">
                        JPG або PNG, бажано фото у повний зріст
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBodyPhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {bodyPhoto && (
                      <img
                        src={bodyPhoto}
                        alt="Фото тіла"
                        className="mt-4 max-h-[420px] w-full rounded-2xl object-cover"
                      />
                    )}

                    <button
                      type="button"
                      onClick={analyzeBodyPhoto}
                      disabled={!bodyPhoto || !profile.gender || bodyAnalysisLoading}
                      className="mt-4 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 p-4 font-bold disabled:cursor-not-allowed disabled:from-gray-600 disabled:to-gray-700"
                    >
                      {bodyAnalysisLoading ? "Аналізую фото..." : "Проаналізувати фото"}
                    </button>

                    {bodyAnalysisError && (
                      <p className="mt-3 rounded-2xl border border-yellow-300/20 bg-yellow-400/10 p-3 text-sm text-yellow-100">
                        {bodyAnalysisError}
                      </p>
                    )}

                    {!profile.gender && (
                      <p className="mt-3 text-sm text-white/45">
                        Спочатку обери стать у профілі, щоб аналіз був точнішим.
                      </p>
                    )}
                  </div>

                  <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-6">
                    {bodyAnalysis ? (
                      <div className="space-y-5">
                        <div className="grid gap-4 md:grid-cols-[0.55fr_1fr]">
                          <div className="rounded-2xl bg-white/5 p-5">
                            <h3 className="text-xl font-bold">Body Score</h3>
                            <p className="mt-4 text-6xl font-black text-pink-400">
                              {bodyAnalysis.bodyScore}
                              <span className="text-2xl text-white/50">/100</span>
                            </p>
                            <p className="mt-3 text-sm text-white/55">
                              Орієнтовна оцінка постави, стабільності і загального візуального прогресу.
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white/5 p-5">
                            <h3 className="text-xl font-bold">Що помічено</h3>
                            <p className="mt-3 text-white/70">{bodyAnalysis.visual}</p>
                            <p className="mt-3 text-sm text-yellow-200">{bodyAnalysis.posture}</p>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <section className="rounded-2xl bg-white/5 p-5">
                            <h3 className="mb-3 font-bold">Можливі зони уваги</h3>
                            <ul className="space-y-2 text-sm text-white/75">
                              {bodyAnalysis.problems.map((item) => (
                                <li key={item} className="rounded-xl bg-black/20 p-3">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </section>

                          <section className="rounded-2xl bg-white/5 p-5">
                            <h3 className="mb-3 font-bold">Рекомендації</h3>
                            <ul className="space-y-2 text-sm text-white/75">
                              {bodyAnalysis.recommendations.map((item) => (
                                <li key={item} className="rounded-xl bg-black/20 p-3">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </section>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full min-h-[360px] flex-col justify-center rounded-2xl bg-white/5 p-6 text-center">
                        <p className="text-5xl">🧍</p>
                        <h3 className="mt-4 text-2xl font-black">Тут з'явиться аналіз</h3>
                        <p className="mt-3 text-white/55">
                          Завантаж фото, обери стать у профілі та натисни аналіз.
                          GlowUp покаже Body Score, можливі зони уваги і вправи.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-6">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold">Графік прогресу</h3>
                        <p className="text-sm text-white/50">Вибери, що показувати за тиждень</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/5 p-2 text-sm md:grid-cols-4">
                        {[
                          ["steps", "Кроки"],
                          ["calories", "Калорії"],
                          ["water", "Вода"],
                          ["habits", "Звички"],
                        ].map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setProgressChartType(key)}
                            className={`rounded-xl px-3 py-2 ${
                              progressChartType === key
                                ? "bg-pink-500 text-white"
                                : "text-white/65 hover:bg-white/10"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(() => {
                      const chartConfig = {
                        steps: {
                          title: "Пройдено кроків",
                          goal: stepsGoal,
                          suffix: "",
                          values: progressChartSeries.steps,
                          labels: progressChartSeries.labels,
                          currentValue: steps,
                        },
                        calories: {
                          title: "Калорії за день",
                          goal: caloriesGoal,
                          suffix: " ккал",
                          values: progressChartSeries.calories,
                          labels: progressChartSeries.labels,
                          currentValue: caloriesTodayTotal,
                        },
                        water: {
                          title: "Випито води",
                          goal: waterGoal,
                          suffix: " мл",
                          values: progressChartSeries.water,
                          labels: progressChartSeries.labels,
                          currentValue: waterConsumedMl,
                        },
                        habits: {
                          title: "Виконані звички",
                          goal: Math.max(habits.length, 1),
                          suffix: "",
                          values: progressChartSeries.habits,
                          labels: progressChartSeries.labels,
                          currentValue: completedHabits,
                        },
                      };
                      const selectedChart = chartConfig[progressChartType];

                      return (
                        <>
                          <div className="mb-4 flex items-end justify-between gap-3">
                            <div>
                              <p className="text-white/55">{selectedChart.title}</p>
                              <p className="text-3xl font-black">
                                {selectedChart.currentValue}
                                {selectedChart.suffix}
                              </p>
                            </div>
                            <p className="text-sm text-white/45">Ціль: {selectedChart.goal}{selectedChart.suffix}</p>
                          </div>
                          <div className="flex h-64 items-end gap-3">
                            {selectedChart.values.map((value, index) => {
                              const height = Math.max(
                                18,
                                Math.min(Math.round((value / selectedChart.goal) * 100), 100)
                              );
                              return (
                                <div key={`${progressChartType}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                                  <div className="flex h-48 w-full items-end rounded-2xl bg-white/5 p-1">
                                    <div
                                      className="w-full rounded-xl bg-gradient-to-t from-purple-500 to-pink-400 transition-all"
                                      style={{ height: `${height}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-white/50">
                                    {selectedChart.labels[index]}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-6">
                    <h3 className="mb-5 text-xl font-bold">Що зроблено</h3>
                    <div className="space-y-4">
                      {[
                        ["Пройдено кроків", `${steps.toLocaleString("uk-UA")} / ${stepsGoal.toLocaleString("uk-UA")}`],
                        ["Випито води", `${waterConsumedMl} / ${waterGoal} мл`],
                        ["З'їдено калорій", `${caloriesTodayTotal} / ${dailyNutritionGoals.calories} ккал`],
                        ["Виконано звичок", `${completedHabits} з ${habits.length}`],
                        ["Тренування", isTimerRunning ? "таймер працює" : `${selectedMinutes} хв заплановано`],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between rounded-2xl bg-white/5 p-4">
                          <span className="text-white/65">{label}</span>
                          <span className="font-bold">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : dashboardTab === "nutrition" ? (
              <section className="space-y-5">
                <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-7">
                  <h3 className="text-2xl font-bold">{t("nutrition")}</h3>
                  <p className="mt-2 text-white/60">
                    {t("nutritionText")}
                  </p>
                </div>

                <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-3xl border border-white/10 bg-[#171430] p-6 xl:col-span-2">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-xl font-black">Денні цілі харчування</h3>
                        <p className="text-sm text-white/50">
                          Прогрес рахується з foodDiary: AI scan + ручні записи.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowNutritionGoalsEditor((value) => !value)}
                        className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
                      >
                        Змінити цілі
                      </button>
                    </div>

                    {showNutritionGoalsEditor && (
                      <div className="mb-5 grid gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-4">
                        {[
                          ["calories", "Ціль калорій"],
                          ["protein", "Ціль білків"],
                          ["fat", "Ціль жирів"],
                          ["carbs", "Ціль вуглеводів"],
                        ].map(([key, label]) => (
                          <input
                            key={key}
                            type="number"
                            min="0"
                            placeholder={label}
                            value={nutritionGoals[key]}
                            onChange={(event) =>
                              setNutritionGoals((goals) => ({
                                ...goals,
                                [key]: event.target.value,
                              }))
                            }
                            className="rounded-2xl border border-white/10 bg-[#0b1022] p-3 text-white outline-none placeholder:text-white/45"
                          />
                        ))}
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        ["calories", "Калорії", caloriesTodayTotal, dailyNutritionGoals.calories, "ккал", "from-orange-400 to-pink-500"],
                        ["protein", "Білки", todayDiaryProtein, dailyNutritionGoals.protein, "г", "from-green-400 to-emerald-500"],
                        ["fat", "Жири", todayDiaryFat, dailyNutritionGoals.fat, "г", "from-pink-400 to-rose-500"],
                        ["carbs", "Вуглеводи", todayDiaryCarbs, dailyNutritionGoals.carbs, "г", "from-sky-400 to-blue-500"],
                      ].map(([key, label, eaten, goal, suffix, gradient]) => (
                        <div key={key} className="rounded-3xl bg-white/[0.055] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm text-white/50">{label}</p>
                              <p className="mt-1 text-2xl font-black">
                                {eaten} / {goal} {suffix}
                              </p>
                            </div>
                            <span className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                              {nutritionProgress[key]}%
                            </span>
                          </div>
                          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all`}
                              style={{ width: `${Math.min(nutritionProgress[key], 100)}%` }}
                            />
                          </div>
                          <p className="mt-3 text-sm text-white/55">
                            Залишилось: {nutritionLeft[key]} {suffix}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-[#171430] p-6 xl:col-span-2">
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-orange-300">Локальна порада по харчуванню</p>
                        <h3 className="mt-1 text-xl font-black">{nutritionAiAdvice.title}</h3>
                        <p className="mt-2 text-sm text-white/50">
                          Розраховано з сьогоднішнього foodDiary, цілей і макросів.
                        </p>
                      </div>
                      <span className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold text-pink-200">
                        {nutritionAiAdvice.source}
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-3xl bg-white/[0.055] p-4">
                        <p className="text-sm text-white/45">Що краще з’їсти далі</p>
                        <p className="mt-2 font-semibold leading-relaxed">{nutritionAiAdvice.nextMeal}</p>
                      </div>
                      <div className="rounded-3xl bg-white/[0.055] p-4">
                        <p className="text-sm text-white/45">Калорії</p>
                        <p className="mt-2 font-semibold leading-relaxed">{nutritionAiAdvice.calorieStatus}</p>
                      </div>
                      <div className="rounded-3xl bg-white/[0.055] p-4">
                        <p className="text-sm text-white/45">Білок</p>
                        <p className="mt-2 font-semibold leading-relaxed">{nutritionAiAdvice.proteinStatus}</p>
                      </div>
                      <div className="rounded-3xl bg-white/[0.055] p-4">
                        <p className="text-sm text-white/45">Чого не вистачає</p>
                        <p className="mt-2 font-semibold leading-relaxed">{nutritionAiAdvice.missing}</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-3xl border border-white/10 bg-gradient-to-r from-pink-500/15 to-orange-400/10 p-4">
                      <p className="text-sm font-bold text-white/80">{nutritionAiAdvice.summary}</p>
                      <p className="mt-1 text-xs text-white/45">
                        Враховано записів за сьогодні: {todayDiaryEntries.length}. Ціль: {profile.goal || "не вказана"}.
                      </p>
                    </div>
                  </div>

                  <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-6">
                    <h3 className="mb-5 text-xl font-bold">{t("caloriesToday")}</h3>
                    <div className="mx-auto grid h-56 w-56 place-items-center rounded-full bg-[conic-gradient(#70d77d_0_35%,#ef5dad_35%_68%,#67a7ff_68%_100%)]">
                      <div className="grid h-40 w-40 place-items-center rounded-full bg-[#171430] text-center">
                        <div>
                          <p className="text-5xl font-black">{caloriesTodayTotal}</p>
                          <p className="text-sm text-white/60">з {dailyNutritionGoals.calories} ккал</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-400 to-pink-500"
                        style={{ width: `${Math.min(nutritionProgress.calories, 100)}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm text-white/55">
                      Зʼїдено {caloriesTodayTotal} / {dailyNutritionGoals.calories} ккал • залишилось {nutritionLeft.calories} ккал
                    </p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => startCamera("food")}
                        className="tap-anim w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 p-4 font-bold shadow-lg shadow-pink-500/20 hover:-translate-y-0.5"
                      >
                        {t("photoFood")}
                      </button>
                      <button
                        type="button"
                        onClick={pickFoodPhotoFromGallery}
                        className="tap-anim w-full rounded-2xl bg-white/10 p-4 font-bold text-white hover:bg-white/15"
                      >
                        Обрати з галереї
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Наприклад: яєчня, омлет, курка з рисом"
                      value={foodName}
                      onChange={(event) => setFoodName(event.target.value)}
                      className="mt-3 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white outline-none placeholder:text-white/50"
                    />
                    <button
                      type="button"
                      onClick={() => analyzeFood()}
                      disabled={foodAnalysisLoading}
                      className={`tap-anim mt-3 flex w-full items-center justify-center gap-3 rounded-xl p-3 font-bold text-white/85 transition disabled:opacity-70 ${
                        foodAnalysisLoading
                          ? "loading-shimmer bg-gradient-to-r from-pink-500/25 to-orange-400/25"
                          : "bg-white/10 hover:bg-white/15"
                      }`}
                    >
                      {foodAnalysisLoading && <span className="scan-spinner h-5 w-5 border-2" />}

                      {foodAnalysisLoading ? "Аналізую фото..." : "Аналізувати страву"}
                    </button>
                    {foodAnalysisError && (
                      <div className="toast-pop error-card mt-4 rounded-2xl border border-rose-400/30 p-4 text-white shadow-lg shadow-rose-950/20">
                        <h3 className="font-black text-rose-100">AI аналіз не вдався</h3>
                        <p className="mt-2 text-sm text-white/70">{foodAnalysisError}</p>
                      </div>
                    )}
                    {foodResult && (
                      <div className="toast-pop mt-4 rounded-2xl border border-white/10 bg-white/10 p-4 text-white shadow-lg shadow-black/10">
                        <h3 className="text-lg font-bold">
                          🍽 {foodResult.name || foodResult.dish}
                        </h3>
                        <p className="mt-2">≈ {foodResult.calories} kcal</p>
                        {"protein" in foodResult && (
                          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-xl bg-white/10 p-2">
                              <p className="text-xs opacity-70">Білки</p>
                              <p className="font-bold">{foodResult.protein}g</p>
                            </div>
                            <div className="rounded-xl bg-white/10 p-2">
                              <p className="text-xs opacity-70">Жири</p>
                              <p className="font-bold">{foodResult.fat}g</p>
                            </div>
                            <div className="rounded-xl bg-white/10 p-2">
                              <p className="text-xs opacity-70">Вуглеводи</p>
                              <p className="font-bold">{foodResult.carbs}g</p>
                            </div>
                          </div>
                        )}
                        <p className="mt-3 text-sm opacity-80">
                          {foodResult.advice || foodResult.note || foodResult.ingredients}
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={addFoodResultToDiary}
                            className="tap-anim rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3 text-sm font-black text-white shadow-lg shadow-pink-500/20 hover:-translate-y-0.5"
                          >
                            Додати в щоденник
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFoodResult(null);
                              setFoodPhoto("");
                            }}
                            className="tap-anim rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15"
                          >
                            Закрити
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    ref={manualFoodFormRef}
                    className="glow-card w-full min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-[#171430] p-4 sm:p-6"
                  >
                    <h3 className="text-xl font-black">Додати їжу вручну</h3>
                    <p className="mt-1 text-sm text-white/50">
                      Запиши страву без фото, і вона одразу потрапить у щоденник.
                    </p>

                    <div className="mt-5 grid min-w-0 gap-3">
                      <input
                        type="text"
                        placeholder="Назва страви"
                        value={manualFood.name}
                        onChange={(event) =>
                          setManualFood((food) => {
                            const nextName = event.target.value;
                            const portion = findManualFoodPortion(nextName);
                            return {
                              ...food,
                              name: nextName,
                              amount: food.amount || (portion ? String(portion.grams) : ""),
                            };
                          })
                        }
                        className="w-full min-w-0 rounded-2xl border border-white/10 bg-white/10 p-3 text-white outline-none placeholder:text-white/45"
                      />
                      <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-3">
                        <p className="break-words text-sm font-bold leading-relaxed text-pink-200">
                          {manualFoodPortion
                            ? manualFoodPortion.label
                            : "Підказки: 1 банан ≈ 120 г, 1 яблуко ≈ 180 г, 1 яйце ≈ 50 г"}
                        </p>
                        <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(140px,auto)]">
                          <label className="text-sm text-white/60">
                            Грамовка / обʼєм
                            <input
                              type="number"
                              min="0"
                              placeholder="Наприклад: 150"
                              value={manualFood.amount}
                              onChange={(event) =>
                                setManualFood((food) => ({ ...food, amount: event.target.value }))
                              }
                              className="mt-2 w-full min-w-0 rounded-xl border border-white/10 bg-white/10 p-3 text-white outline-none placeholder:text-white/40"
                            />
                          </label>
                          <div className="min-w-0 rounded-xl bg-white/10 p-3 text-sm text-white/70">
                            {manualFoodEstimate ? (
                              <>
                                <p className="font-bold text-white">≈ {manualFoodEstimate.calories} ккал</p>
                                <p>
                                  Б {manualFoodEstimate.protein}g • Ж {manualFoodEstimate.fat}g • В {manualFoodEstimate.carbs}g
                                </p>
                              </>
                            ) : (
                              <p>Введи банан, яблуко, яйце, лате, рис, хліб або куряче філе.</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <select
                        value={manualFood.meal}
                        onChange={(event) =>
                          setManualFood((food) => ({ ...food, meal: event.target.value }))
                        }
                        className="rounded-2xl border border-white/10 bg-[#0b1022] p-3 text-white outline-none"
                      >
                        <option value="сніданок">Сніданок</option>
                        <option value="обід">Обід</option>
                        <option value="вечеря">Вечеря</option>
                        <option value="перекус">Перекус</option>
                      </select>
                      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                        {[
                          ["calories", "Калорії"],
                          ["protein", "Білки"],
                          ["fat", "Жири"],
                          ["carbs", "Вуглеводи"],
                        ].map(([key, label]) => (
                          <input
                            key={key}
                            type="number"
                            min="0"
                            placeholder={label}
                            value={manualFood[key]}
                            onChange={(event) =>
                              setManualFood((food) => ({ ...food, [key]: event.target.value }))
                            }
                            className="rounded-2xl border border-white/10 bg-white/10 p-3 text-white outline-none placeholder:text-white/45"
                          />
                        ))}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3">
                        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Ввести штрихкод вручну"
                            value={manualFood.barcode}
                            onChange={(event) =>
                              setManualFood((food) => ({ ...food, barcode: event.target.value.replace(/\D/g, "") }))
                            }
                            className="rounded-xl border border-white/10 bg-white/10 p-3 text-white outline-none placeholder:text-white/45"
                          />
                          <div className="grid gap-2 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={scanFoodBarcode}
                              disabled={isBarcodeScanning || barcodeLookupLoading}
                              className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isBarcodeScanning ? "Сканування..." : "Сканувати штрихкод"}
                            </button>
                            <button
                              type="button"
                              onClick={() => lookupBarcodeProduct()}
                              disabled={!manualFood.barcode.trim() || barcodeLookupLoading}
                              className="rounded-xl bg-pink-500/20 px-4 py-3 text-sm font-bold text-pink-100 hover:bg-pink-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {barcodeLookupLoading ? "Пошук..." : "Знайти продукт"}
                            </button>
                          </div>
                        </div>
                        {barcodeNotice && (
                          <p className="mt-3 rounded-xl bg-pink-500/15 p-3 text-sm text-pink-100">
                            {barcodeNotice}
                          </p>
                        )}
                        {barcodeProductError && (
                          <p className="mt-3 rounded-xl bg-rose-500/15 p-3 text-sm text-rose-100">
                            {barcodeProductError}. Можна додати їжу вручну нижче, barcode залишиться в полі.
                          </p>
                        )}
                        {barcodeProduct && (
                          <div className="mt-4 overflow-hidden rounded-2xl border border-pink-300/20 bg-[#211936] p-4">
                            <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
                              {barcodeProduct.photo ? (
                                <img
                                  src={barcodeProduct.photo}
                                  alt={barcodeProduct.name}
                                  className="h-24 w-24 shrink-0 rounded-2xl object-cover"
                                />
                              ) : (
                                <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-white/10 text-2xl">
                                  🍫
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold uppercase text-pink-200">
                                  Open Food Facts
                                </p>
                                <h4 className="mt-1 break-words text-lg font-black">{barcodeProduct.name}</h4>
                                {barcodeProduct.brand && (
                                  <p className="break-words text-sm text-white/60">{barcodeProduct.brand}</p>
                                )}
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/55">
                                  <span className="rounded-full bg-white/10 px-2 py-1">
                                    Barcode: {barcodeProduct.barcode}
                                  </span>
                                  {barcodeProduct.quantity && (
                                    <span className="rounded-full bg-white/10 px-2 py-1">
                                      {barcodeProduct.quantity}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                                  <div className="rounded-xl bg-white/10 p-2">
                                    <p className="text-white/45">100 г</p>
                                    <p className="font-bold">{barcodeProduct.calories100g} ккал</p>
                                  </div>
                                  <div className="rounded-xl bg-white/10 p-2">
                                    <p className="text-white/45">Білки</p>
                                    <p className="font-bold">{barcodeProduct.protein100g}g</p>
                                  </div>
                                  <div className="rounded-xl bg-white/10 p-2">
                                    <p className="text-white/45">Жири</p>
                                    <p className="font-bold">{barcodeProduct.fat100g}g</p>
                                  </div>
                                  <div className="rounded-xl bg-white/10 p-2">
                                    <p className="text-white/45">Вуглеводи</p>
                                    <p className="font-bold">{barcodeProduct.carbs100g}g</p>
                                  </div>
                                </div>
                                {barcodeProduct.nutriScore && (
                                  <p className="mt-2 text-sm font-bold text-emerald-200">
                                    Nutri-Score: {String(barcodeProduct.nutriScore).toUpperCase()}
                                  </p>
                                )}
                                {barcodeProduct.sourceUrl && (
                                  <a
                                    href={barcodeProduct.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 inline-block text-xs font-bold text-pink-200 underline decoration-pink-300/50"
                                  >
                                    Open Food Facts
                                  </a>
                                )}
                              </div>
                            </div>
                            {barcodeProduct.ingredients && (
                              <p className="mt-3 rounded-xl bg-white/10 p-3 text-sm text-white/65">
                                <span className="font-bold text-white">Склад: </span>
                                {barcodeProduct.ingredients}
                              </p>
                            )}
                            {isChocolateProduct(barcodeProduct) && (
                              <p className="mt-3 text-sm text-pink-100">
                                Для шоколадки: 1 маленький шматочок ≈ 10 г, 1 рядок / пластинка ≈ 25 г,
                                1 плитка ≈ 90-100 г.
                              </p>
                            )}
                            <div className="mt-4 grid gap-3">
                              <div className="grid gap-2 sm:grid-cols-2">
                                {barcodePortionOptions.map((option) => (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setBarcodePortionId(option.id)}
                                    className={`rounded-xl px-3 py-3 text-left text-sm font-bold transition ${
                                      barcodePortionId === option.id
                                        ? "bg-pink-500 text-white"
                                        : "bg-white/10 text-white hover:bg-white/15"
                                    }`}
                                  >
                                    {option.label}
                                    {option.id !== "custom" && (
                                      <span className="block text-xs opacity-75">≈ {option.grams} г</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                              {selectedBarcodePortion?.id === "custom" ? (
                                <label className="text-sm text-white/60">
                                  Грами вручну
                                  <input
                                    type="number"
                                    min="0"
                                    value={barcodeCustomGrams}
                                    onChange={(event) => setBarcodeCustomGrams(event.target.value)}
                                    placeholder="Наприклад: 35"
                                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white outline-none placeholder:text-white/40"
                                  />
                                </label>
                              ) : (
                                <label className="text-sm text-white/60">
                                  Кількість: можна вибрати 1 шматочок, 3 шматочки або іншу кількість
                                  <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={barcodePortionCount}
                                    onChange={(event) => setBarcodePortionCount(event.target.value)}
                                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white outline-none"
                                  />
                                </label>
                              )}
                              <div className="rounded-2xl bg-white/10 p-3">
                                <p className="text-sm text-white/55">Обрана кількість: {barcodeGrams} г</p>
                                {barcodeNutritionEstimate && (
                                  <p className="mt-1 font-black">
                                    {barcodeNutritionEstimate.calories} ккал · Б {barcodeNutritionEstimate.protein}g · Ж{" "}
                                    {barcodeNutritionEstimate.fat}g · В {barcodeNutritionEstimate.carbs}g
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={addBarcodeProductToDiary}
                                disabled={!barcodeNutritionEstimate || !barcodeGrams}
                                className="rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-4 font-black text-white shadow-lg shadow-pink-500/20 disabled:opacity-50"
                              >
                                Додати в щоденник
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={addManualFoodToDiary}
                        disabled={!manualFood.name.trim()}
                        className="rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-4 font-black text-white shadow-lg shadow-pink-500/20 disabled:opacity-50"
                      >
                        Додати
                      </button>
                    </div>
                  </div>

                  <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black">Останній AI scan</h3>
                        <p className="text-sm text-white/50">Збережений результат із food diary.</p>
                      </div>
                      <span className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold text-pink-200">
                        openai
                      </span>
                    </div>
                    {latestAiFoodScan ? (
                      <div className="flex gap-4 rounded-3xl bg-white/[0.055] p-4">
                        {latestAiFoodScan.photo && (
                          <img
                            src={latestAiFoodScan.photo}
                            alt={latestAiFoodScan.name}
                            className="h-24 w-24 shrink-0 rounded-2xl object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-black">{latestAiFoodScan.name}</p>
                          <p className="mt-1 text-sm text-pink-200">
                            {latestAiFoodScan.calories} ккал • {latestAiFoodScan.date}
                          </p>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="rounded-xl bg-white/10 p-2">
                              <p className="text-white/50">Білки</p>
                              <p className="font-bold">{latestAiFoodScan.protein}g</p>
                            </div>
                            <div className="rounded-xl bg-white/10 p-2">
                              <p className="text-white/50">Жири</p>
                              <p className="font-bold">{latestAiFoodScan.fat}g</p>
                            </div>
                            <div className="rounded-xl bg-white/10 p-2">
                              <p className="text-white/50">Вуглеводи</p>
                              <p className="font-bold">{latestAiFoodScan.carbs}g</p>
                            </div>
                          </div>
                          {latestAiFoodScan.advice && (
                            <p className="mt-3 text-sm text-white/65">{latestAiFoodScan.advice}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="empty-state p-5 text-sm leading-relaxed text-white/65">
                        <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-2xl">
                          +
                        </div>
                        <p className="font-bold text-white">???????? ???? ????????</p>
                        <p className="mt-1">
                          ???? ?? ????? ???????. ????? ??? ?????? ??? ??????? AI scan.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black">Щоденник їжі</h3>
                        <p className="text-sm text-white/50">
                          Сьогодні: {todayDiaryCalories} ккал • {todayDiaryEntries.length} записів
                        </p>
                      </div>
                    </div>

                    {foodDiary.length > 0 ? (
                      <div className="space-y-3">
                        {foodDiary.map((item) => (
                          <div
                            key={item.id}
                            className="flex gap-3 rounded-3xl border border-white/10 bg-white/[0.055] p-3"
                          >
                            {item.photo ? (
                              <img
                                src={item.photo}
                                alt={item.name}
                                className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                              />
                            ) : (
                              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/10 text-xl">
                                🍽
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-black">{item.name}</p>
                                  <p className="text-xs text-white/45">
                                    {item.meal || "AI scan"} • {item.date} • {item.source}
                                  </p>
                                  {(item.brand || item.grams) && (
                                    <p className="text-xs text-white/45">
                                      {[item.brand, item.grams ? `${item.grams} г` : ""]
                                        .filter(Boolean)
                                        .join(" • ")}
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFoodDiaryEntry(item.id)}
                                  className="rounded-full bg-white/10 px-3 py-1 text-sm transition hover:bg-rose-500/30"
                                >
                                  Видалити
                                </button>
                              </div>
                              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                                <div className="rounded-xl bg-white/10 p-2">
                                  <p className="text-white/45">Ккал</p>
                                  <p className="font-bold">{item.calories}</p>
                                </div>
                                <div className="rounded-xl bg-white/10 p-2">
                                  <p className="text-white/45">Б</p>
                                  <p className="font-bold">{item.protein}g</p>
                                </div>
                                <div className="rounded-xl bg-white/10 p-2">
                                  <p className="text-white/45">Ж</p>
                                  <p className="font-bold">{item.fat}g</p>
                                </div>
                                <div className="rounded-xl bg-white/10 p-2">
                                  <p className="text-white/45">В</p>
                                  <p className="font-bold">{item.carbs}g</p>
                                </div>
                              </div>
                              {item.advice && (
                                <p className="mt-2 text-sm text-white/55">{item.advice}</p>
                              )}
                              {item.barcode && (
                                <p className="mt-2 text-xs font-bold text-pink-200">
                                  Barcode: {item.barcode}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-3xl bg-white/[0.055] p-5 text-sm text-white/60">
                        Поки що немає записів. Додай їжу вручну або збережи AI scan.
                      </div>
                    )}
                  </div>

                  <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-6">
                    <h3 className="mb-5 text-xl font-bold">{t("recipesMeals")}</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {[...RECIPE_CARDS, ...FOOD_VIDEO_CARDS].map((item) => (
                        <button
                          key={item.title}
                          type="button"
                          onClick={() => setOpenedDish(item)}
                          className="overflow-hidden rounded-2xl bg-white/5 text-left transition hover:bg-white/10"
                        >
                          <img src={item.image} alt={item.title} className="h-40 w-full object-cover" />
                          <div className="p-4">
                            <p className="font-bold">{item.title}</p>
                            <p className="mt-1 text-sm text-white/55">
                              {item.calories || "корисна страва"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : dashboardTab === "training" ? (
              <section className="space-y-5">
                <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-7">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-2xl font-bold">{t("training")}</h3>
                      <p className="mt-2 text-white/60">
                        {t("trainingText")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 shadow-xl sm:p-6 shadow-orange-950/10">
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-xl font-black">Weekly calendar progress</h3>
                      <p className="mt-1 text-sm text-white/55">
                        Ти тренуєшся {workoutStreak} днів підряд
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-2xl bg-green-500/15 px-3 py-2 text-green-200">
                        {completedWorkoutDays} виконано
                      </div>
                      <div className="rounded-2xl bg-white/10 px-3 py-2 text-white/70">
                        {7 - completedWorkoutDays - missedWorkoutDays} заплановано
                      </div>
                      <div className="rounded-2xl bg-rose-500/15 px-3 py-2 text-rose-200">
                        {missedWorkoutDays} пропущено
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
                    {weeklyCalendarProgress.map((day, index) => {
                      const statusLabel =
                        day.status === "completed"
                          ? "виконано"
                          : day.status === "missed"
                            ? "пропущено"
                            : "заплановано";
                      const statusClass =
                        day.status === "completed"
                          ? "border-green-400/50 bg-green-500/15 text-green-100"
                          : day.status === "missed"
                            ? "border-rose-400/40 bg-rose-500/12 text-rose-100"
                            : "border-white/10 bg-white/[0.055] text-white";

                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => setSelectedSplitIndex(index)}
                          className={`rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 ${statusClass}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-black">{day.dayLabel}</span>
                            <span className="text-xl">
                              {day.status === "completed" ? "✅" : day.status === "missed" ? "×" : day.emoji}
                            </span>
                          </div>
                          <p className="mt-3 min-h-[42px] text-sm font-bold leading-tight">
                            {day.title}
                          </p>
                          <p className="mt-2 text-xs opacity-70">{statusLabel}</p>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${day.accent}`}
                              style={{ width: `${day.progress}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                  <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 shadow-xl sm:p-6 shadow-pink-950/20">
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-orange-300">{selectedSplitWorkout.day}</p>
                        <h3 className="mt-1 text-2xl font-black">{selectedSplitWorkout.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-white/55">
                          {selectedSplitWorkout.focus}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-pink-200">
                          Рівень: {workoutDifficultyConfig.label} • Інтенсивність: {workoutDifficultyConfig.intensity}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-orange-200">
                          Ціль: {workoutGoalConfig.label} • {workoutGoalConfig.emphasis}
                        </p>
                      </div>
                      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-3xl">
                        {selectedSplitWorkout.emoji}
                      </span>
                    </div>

                    {workoutPlanNotice && (
                      <div className="mb-5 flex items-start justify-between gap-3 rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-sm text-cyan-50">
                        <p className="leading-relaxed">{workoutPlanNotice}</p>
                        <button
                          type="button"
                          onClick={() => setWorkoutPlanNotice("")}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-white/70"
                          aria-label="Закрити повідомлення"
                        >
                          x
                        </button>
                      </div>
                    )}

                    <div className="mb-5 rounded-3xl border border-white/10 bg-white/[0.04] p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-black">Ціль тренувань</h4>
                          <p className="text-xs text-white/45">{workoutGoalConfig.note}</p>
                        </div>
                        <span className={`rounded-2xl bg-gradient-to-r ${workoutGoalConfig.accent} px-3 py-2 text-xs font-black text-white`}>
                          {workoutGoalConfig.shortLabel}
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {WORKOUT_GOAL_ORDER.map((goal) => {
                          const config = WORKOUT_GOAL_CONFIGS[goal];
                          const isSelected = workoutGoal === goal;

                          return (
                            <button
                              key={goal}
                              type="button"
                              onClick={() => changeWorkoutGoal(goal)}
                              className={`rounded-2xl px-3 py-3 text-left transition ${
                                isSelected
                                  ? `bg-gradient-to-r ${config.accent} text-white shadow-lg shadow-pink-500/20`
                                  : "bg-white/5 text-white/70 hover:bg-white/10"
                              }`}
                            >
                              <span className="block text-sm font-black">{config.label}</span>
                              <span className="mt-1 block text-xs opacity-75">{config.emphasis}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mb-5 grid gap-2 rounded-3xl border border-white/10 bg-white/[0.04] p-2 sm:grid-cols-3">
                      {WORKOUT_DIFFICULTY_ORDER.map((level) => {
                        const config = WORKOUT_DIFFICULTY_LEVELS[level];
                        const isSelected = workoutDifficulty === level;

                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => changeWorkoutDifficulty(level)}
                            className={`rounded-2xl px-3 py-3 text-left transition ${
                              isSelected
                                ? "bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-lg shadow-pink-500/20"
                                : "bg-white/5 text-white/70 hover:bg-white/10"
                            }`}
                          >
                            <span className="block text-sm font-black">{config.label}</span>
                            <span className="mt-1 block text-xs opacity-75">
                              {config.sets}x • {config.reps} повт • {config.timerSeconds} сек
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mb-5 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                      <div className="rounded-2xl bg-white/[0.06] p-3">
                        <p className="text-xs text-white/45">Таймер</p>
                        <p className="text-lg font-black">{selectedSplitWorkout.duration} хв</p>
                      </div>
                      <div className="rounded-2xl bg-white/[0.06] p-3">
                        <p className="text-xs text-white/45">Вправи</p>
                        <p className="text-lg font-black">{selectedSplitWorkout.exercises.length}</p>
                      </div>
                      <div className="rounded-2xl bg-white/[0.06] p-3">
                        <p className="text-xs text-white/45">Прогрес</p>
                        <p className="text-lg font-black">{selectedSplitProgress}%</p>
                      </div>
                      <div className="rounded-2xl bg-white/[0.06] p-3">
                        <p className="text-xs text-white/45">Інтенсивність</p>
                        <p className="text-lg font-black">{selectedSplitWorkout.intensity}</p>
                      </div>
                    </div>

                    <div className="mb-5 h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${selectedSplitWorkout.accent} transition-all duration-500`}
                        style={{ width: `${selectedSplitProgress}%` }}
                      />
                    </div>

                    {isSelectedWorkoutActive && (
                      <div className="mb-5 overflow-hidden rounded-3xl border border-pink-300/30 bg-pink-500/12 p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <ExerciseIllustration type={activeWorkoutIllustrationType} checked={false} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-pink-200">
                              Активне тренування
                            </p>
                            <h4 className="mt-2 text-xl font-black">
                              {activeWorkoutExercise?.name || selectedSplitWorkout.exercises[0]?.name}
                            </h4>
                            <p className="mt-1 text-sm text-white/60">
                              Крок {activeWorkoutIndex + 1} з {selectedSplitWorkout.exercises.length} · {activeWorkoutExercise?.sets} · {activeWorkoutExercise?.timer}
                            </p>
                          </div>
                          <div className="rounded-3xl bg-black/20 px-5 py-4 text-center">
                            <p className="text-xs text-white/45">{isTimerRunning ? "Таймер працює" : "Пауза"}</p>
                            <p className="text-4xl font-black text-white">{timerLabel}</p>
                          </div>
                        </div>

                        <p className="mt-4 text-sm leading-relaxed text-white/70">
                          {getExerciseDemoMeta(activeWorkoutIllustrationType).cue}
                        </p>

                        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${selectedSplitWorkout.accent} transition-all duration-500`}
                            style={{ width: `${activeWorkoutStepProgress}%` }}
                          />
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <button
                            type="button"
                            onClick={isTimerRunning ? pauseActiveWorkout : resumeActiveWorkout}
                            className="rounded-2xl bg-white/10 px-4 py-3 font-black text-white transition hover:bg-white/15"
                          >
                            {isTimerRunning ? "Пауза" : "Продовжити"}
                          </button>
                          <button
                            type="button"
                            onClick={() => goToNextActiveExercise(selectedSplitWorkout)}
                            className="rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3 font-black text-white shadow-lg shadow-pink-500/20"
                          >
                            {activeWorkoutIndex >= selectedSplitWorkout.exercises.length - 1 ? "Фініш" : "Наступна вправа"}
                          </button>
                          <button
                            type="button"
                            onClick={() => completeWeeklyWorkout(selectedSplitWorkout)}
                            className="rounded-2xl bg-emerald-500/20 px-4 py-3 font-black text-emerald-100 transition hover:bg-emerald-500/30"
                          >
                            Завершити
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {selectedSplitWorkout.exercises.map((exercise, index) => {
                        const checked = selectedSplitState.completedExercises?.includes(index);
                        const isCurrentExercise =
                          isSelectedWorkoutActive && activeWorkoutIndex === index;
                        const illustrationType = getExerciseIllustrationType(
                          exercise,
                          selectedSplitWorkout,
                          index
                        );
                        const demoMeta = getExerciseDemoMeta(illustrationType);

                        return (
                          <button
                            key={exercise.name}
                            type="button"
                            onClick={() => toggleWeeklyExercise(selectedSplitWorkout, index)}
                            className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                              isCurrentExercise
                                ? "border-cyan-300/70 bg-cyan-400/15 shadow-lg shadow-cyan-500/10"
                                : checked
                                ? "border-pink-400/60 bg-pink-500/15"
                                : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                            }`}
                          >
                            <ExerciseIllustration type={illustrationType} checked={checked} />
                            <span
                              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${
                                isCurrentExercise
                                  ? "bg-cyan-300 text-slate-950"
                                  : checked
                                  ? "bg-pink-500 text-white"
                                  : "bg-white/10 text-white/50"
                              }`}
                            >
                              {checked ? "✓" : index + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-bold">
                                {exercise.name}
                                {exercise.isGoalAccent && (
                                  <span className="ml-2 rounded-full bg-orange-400/20 px-2 py-0.5 text-xs text-orange-200">
                                    ціль
                                  </span>
                                )}
                                {isCurrentExercise && (
                                  <span className="ml-2 rounded-full bg-cyan-300/20 px-2 py-0.5 text-xs text-cyan-100">
                                    зараз
                                  </span>
                                )}
                              </span>
                              <span className="text-sm text-white/50">
                                {exercise.sets} • {exercise.timer}
                              </span>
                              <span className="mt-1 block text-xs leading-relaxed text-white/45">
                                {demoMeta.label}: {demoMeta.cue}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() =>
                          isSelectedWorkoutActive
                            ? resumeActiveWorkout()
                            : startWeeklyWorkout(selectedSplitWorkout, selectedSplitIndex)
                        }
                        className="rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-4 font-black text-white shadow-lg shadow-pink-500/25"
                      >
                        {isSelectedWorkoutActive ? "Продовжити тренування" : "Почати тренування"}
                      </button>
                      <button
                        type="button"
                        onClick={() => completeWeeklyWorkout(selectedSplitWorkout)}
                        className={`rounded-2xl px-5 py-4 font-black transition ${
                          selectedSplitState.completed
                            ? "bg-green-500/20 text-green-200"
                            : "bg-white/10 text-white hover:bg-white/15"
                        }`}
                      >
                        {selectedSplitState.completed ? "Виконано" : "Завершити"}
                      </button>
                    </div>
                  </div>

                  <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 shadow-xl sm:p-6 shadow-orange-950/10">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-black">Weekly split</h3>
                        <p className="mt-1 text-sm text-white/50">7 днів, різні групи м’язів і recovery.</p>
                        <p className="mt-1 text-xs text-white/40">{workoutDifficultyConfig.note}</p>
                      </div>
                      <span className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold text-orange-200">
                        {workoutDifficultyConfig.shortLabel}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {WEEKLY_WORKOUT_SPLIT.map((workout, index) => {
                        const state = getSplitState(workout.id);
                        const progress = getSplitProgress(workout);

                        return (
                          <button
                            key={workout.id}
                            type="button"
                            onClick={() => setSelectedSplitIndex(index)}
                            className={`rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 ${
                              selectedSplitIndex === index
                                ? "border-pink-400 bg-pink-500/12 shadow-lg shadow-pink-500/15"
                                : "border-white/10 bg-white/[0.045]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold text-white/45">{workout.day}</p>
                                <h4 className="mt-1 font-black">{workout.title}</h4>
                              </div>
                              <span className="text-2xl">{state.completed ? "✅" : workout.emoji}</span>
                            </div>
                            <p className="mt-2 line-clamp-2 text-sm text-white/50">{workout.focus}</p>
                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${workout.accent}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs text-white/45">
                              <span>{workout.duration} хв • {workout.intensity}</span>
                              <span>{progress}%</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-black">Історія тренувань</h4>
                          <p className="mt-1 text-xs text-white/45">
                            Останні завершені тренування зберігаються тут.
                          </p>
                        </div>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/50">
                          {workoutHistory.length}
                        </span>
                      </div>

                      {recentWorkoutHistory.length > 0 ? (
                        <div className="space-y-2">
                          {recentWorkoutHistory.map((entry) => (
                            <div
                              key={entry.id}
                              className="rounded-2xl bg-black/15 p-3 text-sm text-white/70"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate font-black text-white">{entry.title}</p>
                                  <p className="mt-1 text-xs text-white/45">
                                    {entry.date} · {entry.duration} хв · {entry.exercises} вправ
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full bg-green-500/15 px-3 py-1 text-xs font-bold text-green-200">
                                  виконано
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-white/45">
                                {entry.difficulty} · {entry.goal}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-2xl bg-black/15 p-3 text-sm text-white/50">
                          Після завершення першого тренування тут з'явиться запис.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-6">
                    <h3 className="mb-5 text-xl font-bold">{t("chooseWorkout")}</h3>
                    <button
                      type="button"
                      onClick={() => setOpenedWorkout(selectedWorkout)}
                      className="relative block w-full overflow-hidden rounded-2xl text-left"
                    >
                      <img
                        src={selectedWorkout.image}
                        alt={selectedWorkout.title}
                        className="h-72 w-full object-cover"
                      />
                      <div className="absolute inset-0 grid place-items-center bg-black/10 transition hover:bg-black/25">
                        <div className="grid h-16 w-20 place-items-center rounded-2xl bg-red-600 text-3xl shadow-xl">
                          ▶
                        </div>
                      </div>
                      <span className="absolute bottom-3 right-3 rounded bg-black/70 px-2 py-1 text-sm">
                        {selectedWorkout.time}
                      </span>
                    </button>
                    <h4 className="mt-4 text-2xl font-bold">{selectedWorkout.title}</h4>
                    <p className="mt-2 text-white/60">{selectedWorkout.meta}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setOpenedWorkout(selectedWorkout)}
                        className="rounded-2xl bg-white/10 px-4 py-3 font-black text-white transition hover:bg-white/15"
                      >
                        Дивитись відео
                      </button>
                      <button
                        type="button"
                        onClick={startNewWorkoutTimer}
                        className="rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3 font-black text-white shadow-lg shadow-pink-500/20"
                      >
                        Запустити таймер
                      </button>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      {WORKOUT_CARDS.map((item, index) => (
                        <button
                          key={item.title}
                          type="button"
                          onClick={() => setSelectedWorkoutIndex(index)}
                          className={`overflow-hidden rounded-2xl border text-left ${
                            selectedWorkoutIndex === index ? "border-pink-400" : "border-white/10"
                          }`}
                        >
                          <img src={item.image} alt={item.title} className="h-24 w-full object-cover" />
                          <p className="p-3 text-sm font-semibold">{item.title}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-6">
                    <div className="mb-5">
                      <h3 className="text-xl font-bold">Вільний таймер</h3>
                      <p className="mt-1 text-sm text-white/50">
                        Для відеотренування: {selectedWorkout.title}
                      </p>
                    </div>
                    <div className="mx-auto grid h-56 w-56 place-items-center rounded-full bg-[conic-gradient(#5bb7ff_0_50%,#c94cf0_50%_100%)] p-[3px]">
                      <div className="grid h-full w-full place-items-center rounded-full bg-[#171430] text-center">
                        <div>
                          <p className="text-sm text-white/60">Час тренування</p>
                          <p className="text-5xl font-black">{timerLabel}</p>
                          <p className="text-sm text-white/50">{isTimerRunning ? "Працює" : "Готово"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 grid grid-cols-3 gap-3">
                      <button onClick={() => changeTimerMinutes(Math.max(selectedMinutes - 5, 5))} className="rounded-2xl bg-white/10 p-4 text-2xl">−</button>
                      <button onClick={startNewWorkoutTimer} className="rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 p-4 font-bold">Старт відео</button>
                      <button onClick={() => changeTimerMinutes(selectedMinutes + 5)} className="rounded-2xl bg-white/10 p-4 text-2xl">+</button>
                    </div>
                    <button onClick={resetTimer} className="mt-3 w-full rounded-2xl bg-white/10 p-4 font-bold">
                      {t("reset")}
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <>
            <GlowUpLevelCard glowUpLevel={glowUpLevel} totalXp={totalXp} />

            <LatestAchievementCard
              latestAchievement={latestAchievement}
              onOpenProgress={() => setDashboardTab("progress")}
            />

            <section className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 shadow-xl sm:p-6 shadow-pink-950/20">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-orange-300">Сьогоднішнє тренування</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-2xl">
                      {todayWorkout.emoji}
                    </span>
                    <div>
                      <h3 className="text-2xl font-black">{todayWorkout.title}</h3>
                      <p className="mt-1 text-sm text-white/55">{todayWorkout.focus}</p>
                        <p className="mt-1 text-xs font-bold text-pink-200">
                          {workoutDifficultyConfig.label} • {todayWorkout.intensity} інтенсивність
                        </p>
                        <p className="mt-1 text-xs font-bold text-orange-200">
                          Ціль: {workoutGoalConfig.label}
                        </p>
                      </div>
                    </div>
                  </div>

                <div className="grid gap-3 sm:grid-cols-[160px_1fr] lg:min-w-[430px]">
                  <div className="rounded-2xl bg-white/[0.06] p-4 text-center">
                    <p className="text-sm text-white/45">Прогрес</p>
                    <p className="mt-1 text-3xl font-black">{todayWorkoutProgress}%</p>
                    <p className="text-xs text-white/40">{todayWorkout.duration} хв</p>
                  </div>
                  <div className="flex flex-col justify-center rounded-2xl bg-white/[0.06] p-4">
                    <div className="h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${todayWorkout.accent} transition-all duration-500`}
                        style={{ width: `${todayWorkoutProgress}%` }}
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => startWeeklyWorkout(todayWorkout, todayWorkoutIndex)}
                        className="rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3 font-black shadow-lg shadow-pink-500/20"
                      >
                        Почати
                      </button>
                      <button
                        type="button"
                        onClick={() => completeWeeklyWorkout(todayWorkout)}
                        className={`rounded-2xl px-4 py-3 font-black ${
                          todayWorkoutState.completed
                            ? "bg-green-500/20 text-green-200"
                            : "bg-white/10 text-white"
                        }`}
                      >
                        {todayWorkoutState.completed ? "Виконано" : "Завершити"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 shadow-xl shadow-orange-950/10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-orange-300">Серія тренувань</p>
                  <h3 className="mt-1 text-2xl font-black">
                    Ти тренуєшся {workoutStreak} днів підряд
                  </h3>
                  <p className="mt-1 text-sm text-white/50">
                    Цього тижня: {completedWorkoutDays} виконано, {missedWorkoutDays} пропущено.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDashboardTab("training")}
                  className="rounded-2xl bg-white/10 px-5 py-3 font-black text-white transition hover:bg-white/15"
                >
                  Відкрити календар
                </button>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-2">
                {weeklyCalendarProgress.map((day) => (
                  <div
                    key={day.id}
                    className={`h-3 rounded-full ${
                      day.status === "completed"
                        ? "bg-green-400"
                        : day.status === "missed"
                          ? "bg-rose-400"
                          : "bg-white/15"
                    }`}
                    title={`${day.dayLabel}: ${day.status}`}
                  />
                ))}
              </div>
            </section>

            <div ref={waterSectionRef} className="scroll-mt-24">
              <WaterTrackerCard
                waterConsumedMl={waterConsumedMl}
                waterGoal={waterGoal}
                waterGlassesToday={waterGlassesToday}
                waterRemainingMl={waterRemainingMl}
                waterGoalMl={waterGoalMl}
                setWaterGoalMl={setWaterGoalMl}
                waterProgress={waterProgress}
                waterDailyLog={waterDailyLog}
                onUpdateWater={updateWaterAmount}
              />
            </div>

            <div ref={sleepSectionRef} className="scroll-mt-24">
              <SleepTrackerCard
                sleepHours={sleepHours}
                sleepGoal={sleepGoal}
                sleepBedTime={sleepBedTime}
                sleepWakeTime={sleepWakeTime}
                sleepMood={sleepMood}
                sleepNote={sleepNote}
                sleepGoalHours={sleepGoalHours}
                setSleepGoalHours={setSleepGoalHours}
                sleepProgress={sleepProgress}
                sleepQuality={sleepQuality}
                sleepAdvice={sleepAdvice}
                sleepAlarmMessage={sleepAlarmMessage}
                sleepDailyLog={sleepDailyLog}
                onUpdateSleep={updateSleepEntry}
              />
            </div>

            <section ref={habitsSectionRef} className="grid scroll-mt-24 gap-5 xl:grid-cols-2">
              <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 shadow-xl sm:p-7">
                <h3 className="mb-7 text-xl font-bold">Твій прогрес</h3>
                <div className="mb-7 flex justify-center">
                  <div className="relative h-44 w-44">
                    <svg className="h-44 w-44 -rotate-90" viewBox="0 0 176 176">
                      <circle
                        cx="88"
                        cy="88"
                        r="70"
                        stroke="#342451"
                        strokeWidth="12"
                        fill="transparent"
                      />
                      <circle
                        cx="88"
                        cy="88"
                        r="70"
                        stroke="#ec5fb5"
                        strokeWidth="12"
                        fill="transparent"
                        strokeDasharray="440"
                        strokeDashoffset={440 - (440 * weightGoalProgress) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black">{weightGoalProgress}%</span>
                      <span className="text-sm text-white/45">до цілі</span>
                    </div>
                  </div>
                </div>

                <div className="mb-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-black/20 p-3">
                    <p className="text-sm text-white/45">Старт</p>
                    <p className="text-xl font-bold">{startWeight} кг</p>
                  </div>

                  <div className="rounded-2xl bg-black/20 p-3">
                    <p className="text-sm text-white/45">Зараз</p>
                    <input
                      type="number"
                      value={currentWeight}
                      onChange={(event) => updateCurrentWeightValue(event.target.value)}
                      className="w-full bg-transparent text-center text-xl font-bold text-white outline-none"
                    />
                  </div>

                  <div className="rounded-2xl bg-black/20 p-3">
                    <p className="text-sm text-white/45">Ціль</p>
                    <p className="text-xl font-bold">{goalWeight} кг</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-purple-600 p-4 text-center">
                  <p className="text-lg font-semibold">{goalDirectionLabel}:</p>
                  <p className="text-3xl font-black">{remainingToGoal} кг</p>
                </div>

                <div className="mt-5 rounded-2xl bg-black/20 p-4">
                  <p className="text-center text-sm text-white/70">
                    Ти вже пройшла {weightGoalProgress}% шляху. Продовжуй рухатися до своєї цілі 💜
                  </p>
                </div>
              </div>

              <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 shadow-xl sm:p-7">
                <div className="mb-7 flex items-center justify-between">
                  <h3 className="text-xl font-bold">🔥 Калорії сьогодні</h3>
                  <button
                    type="button"
                    onClick={openNutritionDetails}
                    className="text-sm text-purple-300"
                  >
                    Детальніше ›
                  </button>
                </div>
                <div className="grid items-center gap-6 sm:grid-cols-[190px_1fr]">
                  <div className="relative mx-auto grid h-44 w-44 place-items-center rounded-full bg-[conic-gradient(#70d77d_0_35%,#ef5dad_35%_68%,#67a7ff_68%_100%)]">
                    <div className="grid h-32 w-32 place-items-center rounded-full bg-[#171430] text-center">
                      <div>
                        <p className="text-4xl font-black">{caloriesTodayTotal}</p>
                        <p className="text-sm">ккал</p>
                        <p className="text-xs text-white/55">з {dailyNutritionGoals.calories} ккал</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-5">
                    {[
                      ["Білки", `${todayDiaryProtein} / ${dailyNutritionGoals.protein} г`, "bg-green-400"],
                      ["Жири", `${todayDiaryFat} / ${dailyNutritionGoals.fat} г`, "bg-pink-400"],
                      ["Вуглеводи", `${todayDiaryCarbs} / ${dailyNutritionGoals.carbs} г`, "bg-blue-400"],
                    ].map(([label, value, color]) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className={`h-4 w-4 rounded ${color}`} />
                        <div>
                          <p className="font-semibold">{label}</p>
                          <p className="text-white/60">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-7 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-pink-500"
                    style={{ width: `${Math.min(nutritionProgress.calories, 100)}%` }}
                  />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Зʼїдено", `${caloriesTodayTotal} ккал`],
                    ["Рух", `+${activeCalories} ккал`],
                    ["Залишилось", `${remainingCalories} ккал`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs text-white/45">{label}</p>
                      <p className="mt-1 text-lg font-black">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-white/70">
                  Залишилось = {dailyNutritionGoals.calories} - {caloriesTodayTotal} + {activeCalories} = {remainingCalories} ккал
                </p>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <div ref={cycleSectionRef} className="glow-card scroll-mt-24 rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-xl font-bold">Звички</h3>
                  <span className="text-sm text-purple-300">
                    {completedHabits}/{habits.length} виконано
                  </span>
                </div>
                <div className="mb-5 flex gap-2 rounded-2xl bg-white/5 p-2">
                  <input
                    type="text"
                    value={newHabit}
                    onChange={(event) => setNewHabit(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") addHabit();
                    }}
                    placeholder="Впиши нову навичку або звичку..."
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-white outline-none placeholder:text-white/45"
                  />
                  <button
                    type="button"
                    onClick={addHabit}
                    className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 px-4 font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="space-y-3">
                  {habits.length === 0 ? (
                    <p className="rounded-2xl bg-white/5 p-4 text-sm text-white/60">
                      Додай першу навичку і відмічай її виконання щодня.
                    </p>
                  ) : (
                    habits.map((habit, index) => (
                      <div
                        key={`${habit.title}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 p-4 transition hover:bg-white/10"
                      >
                        <button
                          type="button"
                          onClick={() => toggleHabit(index)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <span className="text-2xl">{habit.done ? "✅" : "○"}</span>
                          <span className={habit.done ? "text-white/55 line-through" : ""}>
                            {habit.title}
                          </span>
                        </button>
                        <input
                          type="checkbox"
                          checked={habit.done}
                          onChange={() => toggleHabit(index)}
                          className="h-6 w-6 accent-pink-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeHabit(index)}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-lg font-black text-rose-100 transition hover:bg-rose-500/25"
                          aria-label={`Видалити звичку ${habit.title}`}
                          title="Видалити"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-5 h-3 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
                    style={{ width: `${habitProgress}%` }}
                  />
                </div>
                <div className="mt-5 rounded-3xl bg-white/5 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-200/70">Звіт за 7 днів</p>
                      <p className="mt-1 text-sm text-white/55">Історія зберігається після кожної галочки.</p>
                    </div>
                    <span className="rounded-2xl bg-pink-500/15 px-3 py-2 text-sm font-black text-pink-100">
                      {habitPerfectDays7Days}/7
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ["Серія", `${habitStreakDays} дн.`],
                      ["Середнє", `${habitAverage7Days} / день`],
                      ["Найкращий день", `${habitBest7Days} з ${habits.length || 0}`],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0 rounded-2xl bg-black/20 p-3">
                        <p className="text-xs text-white/40">{label}</p>
                        <p className="mt-1 break-words text-lg font-black text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex h-28 items-end gap-2 overflow-hidden rounded-3xl bg-[#111026] p-3">
                    {habitLast7Days.map((value, index) => {
                      const progress = habits.length ? Math.round((value / habits.length) * 100) : 0;
                      const isPerfect = habits.length > 0 && value >= habits.length;

                      return (
                        <div key={`${progressChartSeries.labels[index]}-habit-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                          <div className="flex h-16 w-full max-w-8 items-end rounded-full bg-white/10 p-1">
                            <div
                              className={`w-full rounded-full ${isPerfect ? "bg-gradient-to-t from-emerald-400 to-cyan-300" : "bg-gradient-to-t from-purple-500 to-pink-500"}`}
                              style={{ height: `${Math.max(progress, value > 0 ? 12 : 5)}%` }}
                            />
                          </div>
                          <span className="truncate text-[11px] font-bold text-white/45">
                            {progressChartSeries.labels[index]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {mostMissedHabit && mostMissedHabit.missedDays > 0 && (
                    <p className="mt-3 rounded-2xl bg-white/5 p-3 text-sm text-white/65">
                      Найчастіше пропускалась: <span className="font-bold text-white">{mostMissedHabit.title}</span> ({mostMissedHabit.missedDays} дн. за тиждень).
                    </p>
                  )}
                </div>
              </div>

              <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-200/70">Здоров'я</p>
                    <h3 className="mt-1 text-xl font-bold text-white">Менструальний цикл</h3>
                    <p className="mt-1 text-sm text-white/55">Календарний прогноз, фертильне вікно і нотатки.</p>
                  </div>
                  <span className="shrink-0 rounded-2xl bg-pink-500/15 px-3 py-2 text-sm font-black text-pink-100">
                    {cycleInfo.ready ? `${cycleInfo.day} день` : "Новий"}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="min-w-0">
                    <span className="mb-1 block text-xs font-bold text-white/55">Початок останніх місячних</span>
                    <input
                      type="date"
                      value={cycleTracker.lastPeriodStart}
                      onChange={(event) =>
                        setCycleTracker((current) => ({ ...current, lastPeriodStart: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
                    />
                  </label>
                  <label className="min-w-0">
                    <span className="mb-1 block text-xs font-bold text-white/55">Довжина циклу</span>
                    <input
                      type="number"
                      min="21"
                      max="45"
                      value={cycleTracker.cycleLength}
                      onChange={(event) =>
                        setCycleTracker((current) => ({ ...current, cycleLength: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
                    />
                  </label>
                  <label className="min-w-0">
                    <span className="mb-1 block text-xs font-bold text-white/55">Тривалість місячних</span>
                    <input
                      type="number"
                      min="2"
                      max="10"
                      value={cycleTracker.periodLength}
                      onChange={(event) =>
                        setCycleTracker((current) => ({ ...current, periodLength: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
                    />
                  </label>
                  <label className="min-w-0">
                    <span className="mb-1 block text-xs font-bold text-white/55">Нотатка</span>
                    <input
                      type="text"
                      value={cycleTracker.note}
                      onChange={(event) =>
                        setCycleTracker((current) => ({ ...current, note: event.target.value }))
                      }
                      placeholder="самопочуття, біль, настрій..."
                      className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/35"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-4 rounded-3xl bg-white/5 p-4 sm:grid-cols-2">
                  <label className="min-w-0">
                    <span className="mb-2 block text-xs font-bold text-white/55">Настрій сьогодні</span>
                    <select
                      value={cycleTracker.mood || ""}
                      onChange={(event) =>
                        setCycleTracker((current) => ({ ...current, mood: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#24203f] px-4 py-3 text-white outline-none"
                    >
                      {CYCLE_MOOD_OPTIONS.map((option) => (
                        <option key={option.value || "empty"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="min-w-0">
                    <span className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-white/55">
                      <span>Рівень болю</span>
                      <span className="rounded-xl bg-pink-500/15 px-2 py-1 text-pink-100">
                        {Number(cycleTracker.painLevel) || 0}/10
                      </span>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={cycleTracker.painLevel || 0}
                      onChange={(event) =>
                        setCycleTracker((current) => ({ ...current, painLevel: Number(event.target.value) }))
                      }
                      className="h-11 w-full accent-pink-500"
                    />
                  </label>

                  <div className="min-w-0 sm:col-span-2">
                    <p className="mb-2 text-xs font-bold text-white/55">Симптоми</p>
                    <div className="flex flex-wrap gap-2">
                      {CYCLE_SYMPTOM_OPTIONS.map((option) => {
                        const selected = Array.isArray(cycleTracker.symptoms)
                          && cycleTracker.symptoms.includes(option.value);

                        return (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                              setCycleTracker((current) => {
                                const currentSymptoms = Array.isArray(current.symptoms) ? current.symptoms : [];
                                return {
                                  ...current,
                                  symptoms: selected
                                    ? currentSymptoms.filter((symptom) => symptom !== option.value)
                                    : [...currentSymptoms, option.value],
                                };
                              })
                            }
                            className={`max-w-full rounded-2xl border px-3 py-2 text-sm font-bold transition ${
                              selected
                                ? "border-pink-400 bg-pink-500/20 text-pink-100"
                                : "border-white/10 bg-black/20 text-white/60"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={saveCycleTrackerEntry}
                  className="mt-4 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-3 font-black text-white shadow-lg shadow-pink-500/20"
                >
                  Зберегти цикл
                </button>

                {cycleMessage && (
                  <p className="mt-3 rounded-2xl bg-white/5 p-3 text-sm text-white/70">{cycleMessage}</p>
                )}

                <div className="mt-4 rounded-3xl bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/45">Поточна фаза</p>
                      <p className="text-2xl font-black text-white">{cycleInfo.phase}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-4 py-2 text-right">
                      <p className="text-xs text-white/45">До наступних</p>
                      <p className="font-black text-white">
                        {cycleInfo.ready ? `${cycleInfo.daysToNext} дн.` : "-"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-300"
                      style={{ width: `${cycleInfo.progress}%` }}
                    />
                  </div>
                  <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                    {[
                      ["Наступні", cycleInfo.ready ? `${formatCycleDate(cycleInfo.nextPeriodStart)} - ${formatCycleDate(cycleInfo.nextPeriodEnd)}` : "-"],
                      ["Овуляція", formatCycleDate(cycleInfo.ovulationDate)],
                      ["Фертильне вікно", cycleInfo.ready ? `${formatCycleDate(cycleInfo.fertileStart)} - ${formatCycleDate(cycleInfo.fertileEnd)}` : "-"],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0 rounded-2xl bg-black/20 p-3">
                        <p className="text-xs text-white/40">{label}</p>
                        <p className="mt-1 break-words font-bold text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {cycleStats.entriesCount > 0 && (
                  <div className="mt-4 rounded-3xl border border-pink-300/10 bg-pink-500/[0.06] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-pink-200/70">
                          Статистика циклу
                        </p>
                        <h4 className="mt-1 text-lg font-black text-white">
                          За {cycleStats.entriesCount} записів
                        </h4>
                      </div>
                      <span className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold text-white/55">
                        Особиста історія
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        ["Середній цикл", cycleStats.averageCycleLength ? `${cycleStats.averageCycleLength} дн.` : "-"],
                        ["Місячні", cycleStats.averagePeriodLength ? `${cycleStats.averagePeriodLength} дн.` : "-"],
                        ["Середній біль", cycleStats.averagePain ? `${cycleStats.averagePain}/10` : "0/10"],
                        ["Записів", cycleStats.entriesCount],
                      ].map(([label, value]) => (
                        <div key={label} className="min-w-0 rounded-2xl bg-black/20 p-3">
                          <p className="text-xs text-white/40">{label}</p>
                          <p className="mt-1 break-words text-lg font-black text-white">{value}</p>
                        </div>
                      ))}
                    </div>

                    {cycleStats.topSymptoms.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-bold text-white/45">Найчастіші симптоми</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {cycleStats.topSymptoms.map((symptom) => (
                            <span
                              key={symptom.value}
                              className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold text-white/70"
                            >
                              {symptom.label} · {symptom.count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="mt-4 text-xs leading-relaxed text-white/35">
                      Прогноз орієнтовний і не замінює консультацію лікаря.
                    </p>
                  </div>
                )}

                {cycleHistory.length > 0 && (
                  <div className="mt-4 max-h-44 space-y-2 overflow-y-auto pr-1">
                    {cycleHistory.slice(0, 4).map((entry) => (
                      <div key={entry.id} className="rounded-2xl bg-white/5 p-3 text-sm text-white/65">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-white">{formatCycleDate(entry.lastPeriodStart)}</span>
                          <span>{entry.cycleLength} дн. цикл · {entry.periodLength} дн.</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {entry.mood && (
                            <span className="rounded-xl bg-purple-500/15 px-2 py-1 text-purple-100">
                              {CYCLE_MOOD_OPTIONS.find((option) => option.value === entry.mood)?.label || entry.mood}
                            </span>
                          )}
                          {Number(entry.painLevel) > 0 && (
                            <span className="rounded-xl bg-pink-500/15 px-2 py-1 text-pink-100">
                              Біль {entry.painLevel}/10
                            </span>
                          )}
                          {(Array.isArray(entry.symptoms) ? entry.symptoms : []).map((symptom) => (
                            <span key={symptom} className="rounded-xl bg-white/10 px-2 py-1 text-white/65">
                              {CYCLE_SYMPTOM_OPTIONS.find((option) => option.value === symptom)?.label || symptom}
                            </span>
                          ))}
                        </div>
                        {entry.note && <p className="mt-1 break-words text-white/50">{entry.note}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-xl font-bold">Тренування дня</h3>
                  <button
                    type="button"
                    onClick={() => setDashboardTab("training")}
                    className="text-purple-300"
                  >
                    Всі тренування ›
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenedWorkout(selectedWorkout)}
                  className="relative block w-full overflow-hidden rounded-2xl text-left"
                >
                  <img
                    src={selectedWorkout.image}
                    alt={selectedWorkout.title}
                    className="h-56 w-full object-cover"
                  />
                  <div className="absolute inset-0 grid place-items-center bg-black/10 transition hover:bg-black/25">
                    <div className="grid h-16 w-20 place-items-center rounded-2xl bg-red-600 text-3xl">▶</div>
                  </div>
                  <span className="absolute bottom-3 right-3 rounded bg-black/70 px-2 py-1 text-sm">{selectedWorkout.time}</span>
                </button>
                <h4 className="mt-4 text-xl font-semibold">{selectedWorkout.title}</h4>
                <p className="mt-2 text-white/60">{selectedWorkout.meta}</p>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {WORKOUT_CARDS.map((item, index) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => setSelectedWorkoutIndex(index)}
                      aria-label={`Обрати тренування: ${item.title}`}
                      className={`overflow-hidden rounded-xl border ${
                        selectedWorkoutIndex === index
                          ? "border-pink-400"
                          : "border-white/10"
                      }`}
                    >
                      <img src={item.image} alt={item.title} className="h-16 w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">Вільний таймер</h3>
                    <p className="mt-1 text-xs text-white/45">{selectedWorkout.title}</p>
                  </div>
                  <button
                    type="button"
                    onClick={startNewWorkoutTimer}
                    className="text-purple-300"
                  >
                    Старт відео +
                  </button>
                </div>
                <div className="mb-5 grid grid-cols-5 gap-2 rounded-2xl bg-white/5 p-2 text-center text-sm">
                  {["HIIT", "Сила", "Йога", "Розтяжка", "Кардіо"].map((tab, index) => (
                    <span key={tab} className={`rounded-xl py-2 ${index === 0 ? "bg-white/10" : ""}`}>
                      {tab}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-[56px_1fr_56px] items-center gap-5">
                  <button
                    onClick={() => changeTimerMinutes(Math.max(selectedMinutes - 5, 5))}
                    className="grid h-14 w-14 place-items-center rounded-full bg-white/10 text-3xl"
                  >
                    −
                  </button>
                  <div className="mx-auto grid h-48 w-48 place-items-center rounded-full bg-[conic-gradient(#5bb7ff_0_50%,#c94cf0_50%_100%)] p-[3px]">
                    <div className="grid h-full w-full place-items-center rounded-full bg-[#171430] text-center">
                      <div>
                        <p className="text-sm text-white/60">Час тренування</p>
                        <p className="text-5xl font-black">{timerLabel}</p>
                        <p className="mt-2 text-sm text-white/50">{isTimerRunning ? "Працює" : "Готово"}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => changeTimerMinutes(selectedMinutes + 5)}
                    className="grid h-14 w-14 place-items-center rounded-full bg-white/10 text-3xl"
                  >
                    +
                  </button>
                </div>
                <div className="mt-6 grid grid-cols-[1fr_80px] gap-4">
                  <button
                    onClick={startNewWorkoutTimer}
                    className="rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 py-4 text-lg font-bold"
                  >
                    ▶ Старт відео
                  </button>
                  <button onClick={resetTimer} className="rounded-2xl bg-white/10 text-3xl">
                    ↻
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-xl font-bold">Правильне харчування</h3>
                  <button
                    type="button"
                    onClick={openFoodVideoLibrary}
                    className="text-purple-300"
                  >
                    Всі відео ›
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenedDish(selectedFoodVideo)}
                  className="mb-4 block w-full overflow-hidden rounded-2xl text-left"
                >
                  <img
                    src={selectedFoodVideo.image}
                    alt={selectedFoodVideo.title}
                    className="h-44 w-full object-cover"
                  />
                  <h4 className="mt-3 text-lg font-semibold">{selectedFoodVideo.title}</h4>
                  <p className="text-sm text-white/55">Натисни, щоб відкрити рецепт</p>
                </button>
                <div className="grid gap-4 sm:grid-cols-3">
                  {FOOD_VIDEO_CARDS.map((item, index) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => {
                        setSelectedFoodVideoIndex(index);
                        setOpenedDish(item);
                      }}
                      className="text-left"
                    >
                      <div className="relative overflow-hidden rounded-xl">
                        <img
                          src={item.image}
                          alt={item.title}
                          className={`h-28 w-full object-cover ${
                            selectedFoodVideoIndex === index ? "ring-2 ring-pink-400" : ""
                          }`}
                        />
                        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs">{item.time}</span>
                      </div>
                      <p className="mt-2 text-sm">{item.title}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="glow-card rounded-3xl border border-white/10 bg-[#171430] p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-xl font-bold">Рецепти</h3>
                  <button
                    type="button"
                    onClick={openRecipeLibrary}
                    className="text-purple-300"
                  >
                    Більше рецептів ›
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenedDish(selectedRecipe)}
                  className="mb-4 block w-full overflow-hidden rounded-2xl text-left"
                >
                  <img
                    src={selectedRecipe.image}
                    alt={selectedRecipe.title}
                    className="h-44 w-full object-cover"
                  />
                  <h4 className="mt-3 text-lg font-semibold">{selectedRecipe.title}</h4>
                  <p className="text-sm text-white/55">{selectedRecipe.calories}</p>
                  <p className="text-sm text-purple-300">Натисни, щоб подивитися рецепт</p>
                </button>
                <div className="grid gap-4 sm:grid-cols-3">
                  {RECIPE_CARDS.map((item, index) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => {
                        setSelectedRecipeIndex(index);
                        setOpenedDish(item);
                      }}
                      className="text-left"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className={`h-28 w-full rounded-xl object-cover ${
                          selectedRecipeIndex === index ? "ring-2 ring-pink-400" : ""
                        }`}
                      />
                      <p className="mt-2 text-sm">{item.title}</p>
                      <p className="text-xs text-white/55">{item.calories}</p>
                    </button>
                  ))}
                </div>
              </div>
            </section>
              </>
            )}
            </div>

            {showQuickActions && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-30 bg-black/20 lg:hidden"
                  onClick={() => setShowQuickActions(false)}
                  aria-label="Закрити швидкі дії"
                />
              <div
                className="quick-menu fixed inset-x-3 bottom-24 z-40 mx-auto max-h-[70vh] max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-white/10 bg-[#15122d]/95 p-4 text-left text-white shadow-2xl shadow-pink-950/20 backdrop-blur lg:hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Швидкі дії"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold">Швидко додати</h3>
                  <button
                    type="button"
                    onClick={() => setShowQuickActions(false)}
                    className="tap-anim grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/15"
                    aria-label="Закрити швидкі дії"
                  >
                    x
                  </button>
                </div>

                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => startCamera("food")}
                    className="tap-anim rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 p-3 text-left font-bold shadow-lg shadow-pink-500/20 hover:-translate-y-0.5"
                  >
                    Сканувати їжу
                  </button>

                  <button
                    type="button"
                    onClick={pickFoodPhotoFromGallery}
                    className="tap-anim rounded-2xl bg-white/10 p-3 text-left font-semibold hover:bg-white/15"
                  >
                    Обрати фото їжі з галереї
                  </button>

                  <button
                    type="button"
                    onClick={openManualFoodForm}
                    className="tap-anim rounded-2xl bg-white/10 p-3 text-left font-semibold hover:bg-white/15"
                  >
                    Додати їжу вручну
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateWaterAmount(250);
                      setShowQuickActions(false);
                    }}
                    className="tap-anim rounded-2xl bg-white/10 p-3 text-left font-semibold hover:bg-white/15"
                  >
                    Додати воду
                  </button>

                  <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <div className="rounded-2xl bg-white/10 p-3 font-semibold">
                      Фото прогресу
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowQuickActions(false);
                        startCamera("before");
                      }}
                      className="tap-anim rounded-2xl bg-white/10 px-4 font-bold hover:bg-white/15"
                    >
                      ДО
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowQuickActions(false);
                        startCamera("after");
                      }}
                      className="tap-anim rounded-2xl bg-white/10 px-4 font-bold hover:bg-white/15"
                    >
                      ПІСЛЯ
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      startWeeklyWorkout(todayWorkout, todayWorkoutIndex);
                      setShowQuickActions(false);
                    }}
                    className="tap-anim rounded-2xl bg-white/10 p-3 text-left font-semibold hover:bg-white/15"
                  >
                    Почати тренування
                  </button>
                </div>
              </div>
              </>
            )}

            <nav
              className="premium-bottom-nav z-40 grid grid-cols-5 items-center rounded-3xl p-2 text-center text-xs text-white/60 backdrop-blur lg:hidden"
              aria-label="Головна навігація"
            >
              <button
                onClick={() => {
                  setDashboardTab("home");
                  setShowQuickActions(false);
                }}
                className={`premium-tab tap-anim ${dashboardTab === "home" ? "premium-tab-active" : ""}`}
                aria-current={dashboardTab === "home" ? "page" : undefined}
              >
                ⌂<br />{t("home")}
              </button>
              <button
                onClick={() => {
                  setDashboardTab("progress");
                  setShowQuickActions(false);
                }}
                className={`premium-tab tap-anim ${dashboardTab === "progress" ? "premium-tab-active" : ""}`}
                aria-current={dashboardTab === "progress" ? "page" : undefined}
              >
                ▥<br />{t("progress")}
              </button>
              <button
                type="button"
                onClick={() => setShowQuickActions((value) => !value)}
                className="premium-add-button tap-anim mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-pink-500 via-fuchsia-500 to-orange-400 text-3xl text-white"
                title="Швидкі дії"
                aria-label="Відкрити швидкі дії"
                aria-expanded={showQuickActions}
              >
                {showQuickActions ? "×" : "+"}
              </button>
              <button
                onClick={() => {
                  setDashboardTab("training");
                  setShowQuickActions(false);
                }}
                className={`premium-tab tap-anim ${dashboardTab === "training" ? "premium-tab-active" : ""}`}
                aria-current={dashboardTab === "training" ? "page" : undefined}
              >
                ⌁<br />Рух
              </button>
              <button
                onClick={() => {
                  setDashboardTab("nutrition");
                  setShowQuickActions(false);
                }}
                className={`premium-tab tap-anim ${dashboardTab === "nutrition" ? "premium-tab-active" : ""}`}
                aria-current={dashboardTab === "nutrition" ? "page" : undefined}
              >
                ◍<br />Їжа
              </button>
            </nav>
          </main>
        </div>
      </div>
  );

}
