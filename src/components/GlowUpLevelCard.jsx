import ProgressBar from "./ProgressBar.jsx";

export default function GlowUpLevelCard({ glowUpLevel, totalXp, compact = false }) {
  const leftToNext = glowUpLevel.nextLevelXp - glowUpLevel.currentLevelXp;

  return (
    <section className="glow-card p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-pink-300">
            GlowUp Level
          </p>
          <h3 className={compact ? "mt-2 text-2xl font-black" : "mt-2 text-3xl font-black"}>
            Рівень {glowUpLevel.level}
          </h3>
          <p className="mt-2 text-sm text-white/55">
            {totalXp} XP загалом · ще {leftToNext} XP до наступного рівня
          </p>
        </div>
        <div className={compact ? "grid min-w-0 gap-3 lg:min-w-[420px]" : "grid min-w-0 gap-3 sm:min-w-[360px]"}>
          <div className="flex items-center justify-between text-sm font-bold text-white/65">
            <span>{glowUpLevel.currentLevelXp} XP</span>
            <span>{glowUpLevel.nextLevelXp} XP</span>
          </div>
          <ProgressBar
            percent={glowUpLevel.progress}
            accent="from-pink-500 via-purple-500 to-orange-400"
            className="h-4 shadow-lg shadow-pink-500/10"
          />
          {!compact && (
            <div className="grid grid-cols-3 gap-2 text-center text-xs text-white/55">
              <span className="rounded-2xl bg-white/5 p-2">+50 тренування</span>
              <span className="rounded-2xl bg-white/5 p-2">+25 вода/сон</span>
              <span className="rounded-2xl bg-white/5 p-2">+10 їжа</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
