import ProgressBar from "./ProgressBar.jsx";

export default function SleepTrackerCard({
  sleepHours,
  sleepGoal,
  sleepBedTime,
  sleepWakeTime,
  sleepGoalHours,
  setSleepGoalHours,
  sleepProgress,
  sleepQuality,
  sleepAdvice,
  sleepAlarmMessage,
  onUpdateSleep,
}) {
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
    </section>
  );
}
