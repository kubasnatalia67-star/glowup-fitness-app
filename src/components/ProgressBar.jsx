export default function ProgressBar({ percent = 0, accent = "from-pink-500 to-purple-500", className = "h-3" }) {
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));

  return (
    <div className={`${className} overflow-hidden rounded-full bg-white/10`}>
      <div
        className={`h-full rounded-full bg-gradient-to-r ${accent} transition-all duration-500`}
        style={{ width: `${safePercent}%` }}
      />
    </div>
  );
}
