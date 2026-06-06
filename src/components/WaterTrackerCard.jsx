import ProgressBar from "./ProgressBar.jsx";

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getLastWaterDates = (count = 7) => {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (count - 1 - index));
    return getLocalDateKey(date);
  });
};

const formatWaterDate = (dateKey) => {
  const [, month, day] = dateKey.split("-");
  return `${Number(day)}.${Number(month)}`;
};

export default function WaterTrackerCard({
  waterConsumedMl,
  waterGoal,
  waterGlassesToday,
  waterRemainingMl,
  waterGoalMl,
  setWaterGoalMl,
  waterProgress,
  waterDailyLog = {},
  onUpdateWater,
  onUpdateWaterEntry,
  onDeleteWaterEntry,
}) {
  const todayKey = getLocalDateKey();
  const waterHistory = getLastWaterDates(7).map((dateKey) => {
    const amount = dateKey === todayKey ? waterConsumedMl : Number(waterDailyLog[dateKey]) || 0;
    return {
      dateKey,
      amount,
      reachedGoal: amount >= waterGoal,
    };
  });
  const totalWater = waterHistory.reduce((sum, item) => sum + item.amount, 0);
  const averageWater = Math.round(totalWater / waterHistory.length);
  const goalDays = waterHistory.filter((item) => item.reachedGoal).length;
  const bestDay = waterHistory.reduce(
    (best, item) => (item.amount > best.amount ? item : best),
    { amount: 0, dateKey: "" }
  );
  const maxChartMl = Math.max(waterGoal, bestDay.amount, 2000);
  const loggedWaterDays = [...waterHistory]
    .filter((item) => item.amount > 0)
    .reverse();

  return (
    <section className="glow-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-cyan-200">Вода сьогодні</p>
          <h3 className="mt-1 text-2xl font-black">
            {waterConsumedMl} / {waterGoal} мл
          </h3>
          <p className="mt-1 text-sm text-white/50">
            {waterGlassesToday} скл. випито. Залишилось {waterRemainingMl} мл.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:w-72">
          <button
            type="button"
            onClick={() => onUpdateWater(250)}
            className="tap-anim rounded-2xl bg-cyan-400/15 px-3 py-3 font-black text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-400/25"
          >
            +250
          </button>
          <button
            type="button"
            onClick={() => onUpdateWater(500)}
            className="tap-anim rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-3 py-3 font-black text-white shadow-lg shadow-cyan-500/20 hover:-translate-y-0.5"
          >
            +500
          </button>
          <button
            type="button"
            onClick={() => onUpdateWater(-250)}
            className="tap-anim rounded-2xl bg-white/10 px-3 py-3 font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
          >
            -250
          </button>
        </div>
      </div>

      <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-white/60 sm:max-w-xs">
        Денна ціль води
        <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 px-4">
          <input
            type="number"
            min="250"
            step="250"
            value={waterGoalMl}
            onChange={(event) =>
              setWaterGoalMl(Math.max(250, Number(event.target.value) || 250))
            }
            className="w-full bg-transparent py-3 text-white outline-none"
          />
          <span className="text-white/45">мл</span>
        </div>
      </label>

      <div className="mt-4">
        <ProgressBar percent={waterProgress} accent="from-cyan-300 to-blue-500" />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-white/45">
        <span>{waterProgress}% цілі</span>
        <span>Ціль: {waterGoal} мл</span>
      </div>

      <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">
              Звіт води за 7 днів
            </p>
            <h4 className="mt-2 text-xl font-black">
              {averageWater ? `${averageWater} мл в середньому` : "Ще немає історії"}
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs sm:w-56">
            <div className="rounded-2xl bg-white/10 px-3 py-2">
              <span className="block text-lg font-black">{goalDays}/7</span>
              <span className="text-white/50">днів ціль</span>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2">
              <span className="block text-lg font-black">{bestDay.amount}</span>
              <span className="text-white/50">найкращий мл</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 items-end gap-2">
          {waterHistory.map((item) => {
            const height = item.amount ? Math.max(16, Math.round((item.amount / maxChartMl) * 86)) : 10;
            return (
              <div key={item.dateKey} className="text-center">
                <div className="flex h-24 items-end justify-center rounded-2xl bg-black/15 px-1 pb-1">
                  <div
                    className={`w-full rounded-xl ${
                      item.reachedGoal
                        ? "bg-gradient-to-t from-cyan-300 to-blue-400"
                        : item.amount
                          ? "bg-gradient-to-t from-white/25 to-cyan-300/60"
                          : "bg-white/10"
                    }`}
                    style={{ height: `${height}px` }}
                  />
                </div>
                <p className="mt-1 text-[10px] font-bold text-white/45">{formatWaterDate(item.dateKey)}</p>
                <p className="text-[10px] text-white/60">{item.amount ? `${item.amount}` : "-"}</p>
              </div>
            );
          })}
        </div>

        {loggedWaterDays.length > 0 && (
          <div className="mt-5 rounded-3xl bg-black/15 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h5 className="font-black text-white">Історія води</h5>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/50">
                {loggedWaterDays.length} дн.
              </span>
            </div>
            <div className="space-y-2">
              {loggedWaterDays.map((entry) => (
                <div
                  key={entry.dateKey}
                  className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/5 p-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-white">{formatWaterDate(entry.dateKey)}</p>
                    <p className="text-sm font-black text-cyan-100">{entry.amount} мл</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateWaterEntry?.(entry.dateKey, -250)}
                      className="grid h-9 min-w-9 place-items-center rounded-xl bg-white/10 px-2 font-black text-white"
                      aria-label={`Зменшити воду за ${formatWaterDate(entry.dateKey)} на 250 мл`}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateWaterEntry?.(entry.dateKey, 250)}
                      className="grid h-9 min-w-9 place-items-center rounded-xl bg-cyan-400/15 px-2 font-black text-cyan-100"
                      aria-label={`Додати 250 мл за ${formatWaterDate(entry.dateKey)}`}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteWaterEntry?.(entry.dateKey)}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-lg font-bold text-white/45 transition hover:border-rose-300/40 hover:bg-rose-500/15 hover:text-rose-100"
                      aria-label={`Видалити запис води за ${formatWaterDate(entry.dateKey)}`}
                      title="Видалити запис"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
