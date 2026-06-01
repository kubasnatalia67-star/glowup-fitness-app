export default function LatestAchievementCard({ latestAchievement, onOpenProgress }) {
  return (
    <section className="glow-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-yellow-200">Останнє досягнення</p>
          {latestAchievement ? (
            <>
              <h3 className="mt-1 text-2xl font-black">
                {latestAchievement.icon} {latestAchievement.title}
              </h3>
              <p className="mt-1 text-sm text-white/50">
                Відкрито {new Date(latestAchievement.unlockedAt).toLocaleDateString("uk-UA")}
              </p>
            </>
          ) : (
            <>
              <h3 className="mt-1 text-2xl font-black">Перший бейдж чекає</h3>
              <p className="mt-1 text-sm text-white/50">
                Заверши тренування або додай їжу, щоб відкрити перше досягнення.
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenProgress}
          className="tap-anim rounded-2xl bg-white/10 px-5 py-3 font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
        >
          Всі бейджі
        </button>
      </div>
    </section>
  );
}
