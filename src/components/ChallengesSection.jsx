import ProgressBar from "./ProgressBar.jsx";

export default function ChallengesSection({ challengeCards, onStartChallenge }) {
  return (
    <section className="glow-card p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">
            Челенджі
          </p>
          <h3 className="mt-2 text-2xl font-black">GlowUp Challenges</h3>
          <p className="mt-2 text-sm text-white/55">
            Почни челендж, виконуй дії й отримуй XP + badge після завершення.
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/70">
          active / completed / locked
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {challengeCards.map((challenge) => (
          <div
            key={challenge.id}
            className={`interactive-card rounded-3xl border p-5 ${
              challenge.status === "completed"
                ? "border-emerald-300/30 bg-emerald-400/10 shadow-lg shadow-emerald-500/10"
                : challenge.status === "active"
                  ? "border-cyan-300/25 bg-white/[0.065] shadow-lg shadow-cyan-500/10"
                  : "border-white/10 bg-white/[0.035]"
            }`}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div
                className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${challenge.accent} text-2xl shadow-lg shadow-pink-500/15 ${
                  challenge.status === "completed" ? "badge-pop" : ""
                }`}
              >
                {challenge.status === "locked" ? "🔒" : challenge.icon}
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                  challenge.status === "completed"
                    ? "bg-emerald-400/20 text-emerald-100"
                    : challenge.status === "active"
                      ? "bg-cyan-400/20 text-cyan-100"
                      : "bg-white/10 text-white/45"
                }`}
              >
                {challenge.status}
              </span>
            </div>

            <h4 className="text-lg font-black">{challenge.title}</h4>
            <p className="mt-2 min-h-[44px] text-sm leading-relaxed text-white/55">
              {challenge.description}
            </p>

            <div className="mt-5 flex items-center justify-between text-sm font-bold text-white/65">
              <span>
                {challenge.progress}/{challenge.target} {challenge.unit}
              </span>
              <span>{challenge.percent}%</span>
            </div>
            <ProgressBar percent={challenge.percent} accent={challenge.accent} />

            {challenge.status === "completed" ? (
              <div className="mt-4 rounded-2xl bg-emerald-400/10 p-3 text-sm font-bold text-emerald-100">
                Badge earned · +75 XP
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onStartChallenge(challenge.id)}
                disabled={challenge.status === "active"}
                className={`tap-anim mt-4 w-full rounded-2xl p-3 font-black transition ${
                  challenge.status === "active"
                    ? "cursor-default bg-white/10 text-white/45"
                    : "bg-gradient-to-r from-cyan-400 to-purple-500 text-white shadow-lg shadow-cyan-500/20 hover:scale-[1.01]"
                }`}
              >
                {challenge.status === "active" ? "Челендж активний" : "Почати челендж"}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
