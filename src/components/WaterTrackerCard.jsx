import ProgressBar from "./ProgressBar.jsx";

export default function WaterTrackerCard({
  waterConsumedMl,
  waterGoal,
  waterGlassesToday,
  waterRemainingMl,
  waterGoalMl,
  setWaterGoalMl,
  waterProgress,
  onUpdateWater,
}) {
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
    </section>
  );
}
