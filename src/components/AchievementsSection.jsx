export default function AchievementsSection({ achievementCards }) {
  const unlockedCount = achievementCards.filter((badge) => badge.unlocked).length;

  return (
    <section className="glow-card p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-yellow-200">
            Achievements
          </p>
          <h3 className="mt-2 text-2xl font-black">Бейджі GlowUp</h3>
          <p className="mt-2 text-sm text-white/55">
            Відкрито {unlockedCount} з {achievementCards.length}. Новий бейдж дає +25 XP.
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/70">
          locked / unlocked
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {achievementCards.map((badge) => (
          <div
            key={badge.id}
            className={`interactive-card rounded-3xl border p-4 ${
              badge.unlocked
                ? "border-yellow-300/30 bg-white/[0.075] shadow-lg shadow-yellow-500/10 hover:shadow-yellow-500/20"
                : "border-white/10 bg-white/[0.035] opacity-55 grayscale"
            }`}
          >
            <div
              className={`mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${badge.accent} text-2xl shadow-lg ${
                badge.unlocked ? "badge-pop shadow-pink-500/20" : "shadow-none"
              }`}
            >
              {badge.unlocked ? badge.icon : "🔒"}
            </div>
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-black leading-tight">{badge.title}</h4>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                  badge.unlocked
                    ? "bg-emerald-400/20 text-emerald-100"
                    : badge.ready
                      ? "bg-yellow-400/20 text-yellow-100"
                      : "bg-white/10 text-white/45"
                }`}
              >
                {badge.unlocked ? "unlocked" : "locked"}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/55">{badge.description}</p>
            {badge.unlocked && (
              <p className="mt-3 text-xs font-bold text-yellow-100">
                {new Date(badge.unlockedAt).toLocaleDateString("uk-UA")}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
