export default function AIFoodScanResult({
  foodResult,
  foodPhoto,
  foodAnalysisError,
  foodAnalysisLoading,
  onAddToDiary,
  onCloseResult,
  onCloseError,
  onRetry,
}) {
  return (
    <>
      {foodAnalysisLoading && !foodResult && (
        <div className="toast-pop glow-card fixed inset-x-3 bottom-24 z-[66] mx-auto w-[calc(100vw-1.5rem)] max-w-md p-4 text-white">
          <div className="flex min-w-0 items-center gap-4">
            {foodPhoto ? (
              <img
                src={foodPhoto}
                alt="Фото їжі"
                className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-lg shadow-black/20"
              />
            ) : (
              <div className="scan-spinner shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-black">AI аналізує їжу...</h3>
              <p className="mt-1 text-sm text-white/60">
                Перевіряю фото, склад і приблизні калорії.
              </p>
              <div className="loading-shimmer mt-3 h-2 rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      )}

      {foodResult && foodPhoto && (
        <div className="toast-pop glow-card fixed inset-x-3 bottom-24 z-[65] mx-auto w-[calc(100vw-1.5rem)] max-w-md overflow-hidden p-3 text-white sm:p-4">
          <div className="flex min-w-0 gap-3 sm:gap-4">
            <img
              src={foodPhoto}
              alt="Фото їжі"
              className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-lg shadow-black/20 sm:h-24 sm:w-24"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words text-base font-bold leading-snug sm:text-lg">
                    🍽 {foodResult.name || foodResult.dish}
                  </h3>
                  <p className="text-pink-300">{foodResult.calories} ккал</p>
                </div>
                <button
                  type="button"
                  onClick={onCloseResult}
                  className="tap-anim shrink-0 rounded-full bg-white/10 px-3 py-1 hover:bg-white/15"
                >
                  x
                </button>
              </div>

              {"protein" in foodResult ? (
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="min-w-0 rounded-xl bg-white/10 p-2">
                    <p className="truncate opacity-70">Білки</p>
                    <p className="font-bold">{foodResult.protein}g</p>
                  </div>
                  <div className="min-w-0 rounded-xl bg-white/10 p-2">
                    <p className="truncate opacity-70">Жири</p>
                    <p className="font-bold">{foodResult.fat}g</p>
                  </div>
                  <div className="min-w-0 rounded-xl bg-white/10 p-2">
                    <p className="truncate opacity-70">Вуглеводи</p>
                    <p className="font-bold">{foodResult.carbs}g</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-2 break-words text-sm text-white/70">{foodResult.ingredients}</p>
                  <p className="mt-1 break-words text-xs text-white/50">{foodResult.macros}</p>
                </>
              )}

              <p className="mt-2 break-words text-sm text-white/70">
                {foodResult.advice || foodResult.note}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onAddToDiary}
                  className="tap-anim min-w-0 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-3 py-3 text-center text-sm font-black leading-tight text-white shadow-lg shadow-pink-500/25 hover:-translate-y-0.5"
                >
                  Додати в щоденник
                </button>
                <button
                  type="button"
                  onClick={onCloseResult}
                  className="tap-anim min-w-0 rounded-2xl bg-white/10 px-3 py-3 text-sm font-black text-white hover:bg-white/15"
                >
                  Закрити
                </button>
              </div>
            </div>
          </div>
          <p className="mt-3 break-words text-xs text-white/45">
            Оцінка створена AI. Для точності можна додати назву страви вручну.
          </p>
        </div>
      )}

      {foodAnalysisError && (
        <div className="toast-pop error-card fixed inset-x-3 bottom-24 z-[65] mx-auto w-[calc(100vw-1.5rem)] max-w-md rounded-3xl border border-rose-400/30 p-4 text-white shadow-2xl shadow-rose-950/30">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-500/20 text-xl">
              !
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-black text-rose-100">AI аналіз не вдався</h3>
                  <p className="mt-1 break-words text-sm leading-relaxed text-white/70">
                    {foodAnalysisError}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCloseError}
                  className="tap-anim shrink-0 rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/15"
                >
                  x
                </button>
              </div>
              <button
                type="button"
                onClick={onRetry}
                disabled={foodAnalysisLoading || !foodPhoto}
                className="tap-anim mt-3 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-black shadow-lg shadow-rose-500/20 disabled:opacity-50"
              >
                Спробувати ще раз
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
