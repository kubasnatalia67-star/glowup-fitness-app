import ProgressBar from "./ProgressBar.jsx";

const timeToMinutes = (time) => {
  if (!time) return null;
  const [hours, minutes] = String(time).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const getSleepDuration = (bedTime, wakeTime) => {
  const start = timeToMinutes(bedTime);
  const end = timeToMinutes(wakeTime);
  if (start === null || end === null) return 0;
  const diff = end >= start ? end - start : 24 * 60 - start + end;
  return Math.round((diff / 60) * 10) / 10;
};

const getDateKey = (date) => date.toISOString().slice(0, 10);

const getLastSleepDates = (count = 7) => {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (count - 1 - index));
    return getDateKey(date);
  });
};

const formatSleepDate = (dateKey) => {
  const [, month, day] = dateKey.split("-");
  return `${Number(day)}.${Number(month)}`;
};

const sleepMoodOptions = [
  ["", "Самопочуття"],
  ["great", "Виспалась"],
  ["ok", "Нормально"],
  ["tired", "Втома"],
  ["stress", "Стрес"],
];

const sleepMoodLabels = {
  great: "Виспалась",
  ok: "Нормально",
  tired: "Втома",
  stress: "Стрес",
};

export default function SleepTrackerCard({
  sleepHours,
  sleepGoal,
  sleepBedTime,
  sleepWakeTime,
  sleepMood,
  sleepNote,
  sleepGoalHours,
  setSleepGoalHours,
  sleepProgress,
  sleepQuality,
  sleepAdvice,
  sleepAlarmMessage,
  sleepDailyLog = {},
  onUpdateSleep,
}) {
  const sleepHistory = getLastSleepDates(7).map((dateKey) => {
    const entry = sleepDailyLog[dateKey] || {};
    const hours = getSleepDuration(entry.bedTime, entry.wakeTime);
    return {
      dateKey,
      hours,
      reachedGoal: hours >= sleepGoal,
    };
  });
  const loggedNights = sleepHistory.filter((item) => item.hours > 0);
  const recentSleepEntries = Object.entries(sleepDailyLog)
    .map(([dateKey, entry]) => ({
      dateKey,
      ...entry,
      hours: getSleepDuration(entry?.bedTime, entry?.wakeTime),
    }))
    .filter((entry) => entry.hours > 0 || entry.note || entry.mood)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .slice(0, 5);
  const averageSleep = loggedNights.length
    ? Math.round((loggedNights.reduce((sum, item) => sum + item.hours, 0) / loggedNights.length) * 10) / 10
    : 0;
  const goalNights = sleepHistory.filter((item) => item.reachedGoal).length;
  const bestNight = loggedNights.reduce(
    (best, item) => (item.hours > best.hours ? item : best),
    { hours: 0, dateKey: "" }
  );
  const maxChartHours = Math.max(sleepGoal, bestNight.hours, 8);

  return (
    <section className="glow-card p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-indigo-200">Сон сьогодні</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-black">
              {sleepHours ? `${sleepHours} год` : "Додай сон"}
            </h3>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${sleepQuality.badge}`}>
              {sleepQuality.label}
            </span>
          </div>
          <p className="mt-2 text-sm text-white/50">
            Ціль: {sleepGoal} год. Лягла: {sleepBedTime || "--:--"} · Прокинулась: {sleepWakeTime || "--:--"}
          </p>
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-3 xl:w-[520px]">
          <label className="text-sm font-semibold text-white/60">
            Лягла спати
            <input
              type="time"
              value={sleepBedTime}
              onChange={(event) => onUpdateSleep("bedTime", event.target.value)}
              onInput={(event) => onUpdateSleep("bedTime", event.currentTarget.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-white outline-none focus:border-indigo-300"
            />
          </label>

          <label className="text-sm font-semibold text-white/60">
            Прокинулась
            <input
              type="time"
              value={sleepWakeTime}
              onChange={(event) => onUpdateSleep("wakeTime", event.target.value)}
              onInput={(event) => onUpdateSleep("wakeTime", event.currentTarget.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-white outline-none focus:border-indigo-300"
            />
          </label>

          <label className="text-sm font-semibold text-white/60">
            Ціль сну
            <div className="mt-2 flex items-center rounded-2xl border border-white/10 bg-white/5 px-3">
              <input
                type="number"
                min="4"
                max="12"
                step="0.5"
                value={sleepGoalHours}
                onChange={(event) =>
                  setSleepGoalHours(Math.max(4, Number(event.target.value) || 8))
                }
                className="w-full bg-transparent py-3 text-white outline-none"
              />
              <span className="text-white/45">год</span>
            </div>
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
        <label className="text-sm font-semibold text-white/60">
          Самопочуття зранку
          <select
            value={sleepMood}
            onChange={(event) => onUpdateSleep("mood", event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-white outline-none focus:border-indigo-300"
          >
            {sleepMoodOptions.map(([value, label]) => (
              <option key={value || "empty"} value={value} className="bg-[#171430] text-white">
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-white/60">
          Нотатка
          <input
            type="text"
            value={sleepNote}
            onChange={(event) => onUpdateSleep("note", event.target.value.slice(0, 140))}
            placeholder="Що вплинуло на сон: кава, стрес, тренування..."
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-white outline-none placeholder:text-white/35 focus:border-indigo-300"
          />
        </label>
      </div>

      <div className="mt-5">
        <ProgressBar percent={sleepProgress} accent="from-indigo-300 via-purple-400 to-pink-400" />
      </div>

      <div className="mt-4 rounded-2xl border border-indigo-300/15 bg-indigo-400/10 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-200">
          Порада по сну
        </p>
        <p className={`mt-2 text-sm leading-relaxed ${sleepQuality.tone}`}>
          {sleepAdvice}
        </p>
      </div>

      {sleepAlarmMessage && (
        <div className="mt-3 rounded-2xl border border-pink-300/20 bg-pink-500/10 p-4 text-sm font-semibold text-pink-100">
          {sleepAlarmMessage}
        </div>
      )}

      <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-purple-200">
              Звіт сну за 7 днів
            </p>
            <h4 className="mt-2 text-xl font-black">
              {averageSleep ? `${averageSleep} год в середньому` : "Ще немає історії"}
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs sm:w-56">
            <div className="rounded-2xl bg-white/10 px-3 py-2">
              <span className="block text-lg font-black">{goalNights}/7</span>
              <span className="text-white/50">ночей ціль</span>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2">
              <span className="block text-lg font-black">{bestNight.hours || 0}</span>
              <span className="text-white/50">найкраща год</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 items-end gap-2">
          {sleepHistory.map((item) => {
            const height = item.hours ? Math.max(18, Math.round((item.hours / maxChartHours) * 86)) : 12;
            return (
              <div key={item.dateKey} className="text-center">
                <div className="flex h-24 items-end justify-center rounded-2xl bg-black/15 px-1 pb-1">
                  <div
                    className={`w-full rounded-xl ${
                      item.reachedGoal
                        ? "bg-gradient-to-t from-indigo-300 to-pink-300"
                        : item.hours
                          ? "bg-gradient-to-t from-white/25 to-purple-300/60"
                          : "bg-white/10"
                    }`}
                    style={{ height: `${height}px` }}
                  />
                </div>
                <p className="mt-1 text-[10px] font-bold text-white/45">{formatSleepDate(item.dateKey)}</p>
                <p className="text-[10px] text-white/60">{item.hours ? `${item.hours}г` : "—"}</p>
              </div>
            );
          })}
        </div>

        {recentSleepEntries.length > 0 && (
          <div className="mt-5 rounded-3xl bg-black/15 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h5 className="font-black text-white">Історія сну</h5>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/50">
                {recentSleepEntries.length} записів
              </span>
            </div>
            <div className="space-y-2">
              {recentSleepEntries.map((entry) => (
                <div key={entry.dateKey} className="rounded-2xl bg-white/5 p-3 text-sm text-white/70">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-white">{formatSleepDate(entry.dateKey)}</span>
                    <span className="font-black text-indigo-100">{entry.hours ? `${entry.hours} год` : "без часу"}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/45">
                    {entry.bedTime || "--:--"} - {entry.wakeTime || "--:--"}
                    {entry.mood ? ` · ${sleepMoodLabels[entry.mood] || entry.mood}` : ""}
                  </p>
                  {entry.note && <p className="mt-2 break-words text-white/60">{entry.note}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
