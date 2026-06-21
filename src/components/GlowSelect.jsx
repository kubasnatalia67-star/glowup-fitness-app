import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const cleanText = (text) => {
  const value = String(text || "");
  if (!value) return value;
  if (value.includes("Рџ") && value.includes("С—")) return "Прийом їжі";
  if (value.includes("РЈРє")) return "Українська";
  if (value.includes("Fran")) return "Français";
  if (value.includes("Espa")) return "Español";
  if (value.includes("Portugu")) return "Português";
  if (value.includes("РќРµ") && value.includes("РІРє")) return "Не вказано";
  if (value.includes("РЎРЅ")) return "Сніданок";
  if (value.includes("РћР±")) return "Обід";
  if (value.includes("Р’Рµ")) return "Вечеря";
  if (value.includes("РџРµ")) return "Перекус";
  if (value.includes("РЎР°") || value.includes("РЅР°СЃС‚")) return "Обери настрій";
  if (value.includes("Р’РёСЃ")) return "Виспалась";
  if (value.includes("РќРѕСЂ")) return "Нормально";
  if (value.includes("Р’С‚")) return "Втома";
  if (value.includes("РЎС‚СЂ")) return "Стрес";
  return value;
};

export default function GlowSelect({
  value,
  options,
  onChange,
  title = "Обери варіант",
  ariaLabel,
  className = "",
  accentClass = "from-pink-500 to-orange-400",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedOptions = useMemo(
    () =>
      options.map((option) =>
        Array.isArray(option)
          ? { value: option[0], label: cleanText(option[1]) }
          : { ...option, label: cleanText(option.label) }
      ),
    [options]
  );
  const selectedOption =
    normalizedOptions.find((option) => option.value === value) || normalizedOptions[0];

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  const chooseOption = (nextValue) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  const menu = isOpen ? (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center overflow-hidden bg-black/75 p-3 sm:items-center"
      onClick={() => setIsOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={cleanText(title)}
        className="max-h-[min(70dvh,560px)] w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#15122d] text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
          <h3 className="text-xl font-black">{cleanText(title)}</h3>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Закрити список"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white/70"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[calc(min(70dvh,560px)-73px)] space-y-2 overflow-y-auto overscroll-contain p-3">
          {normalizedOptions.map((option) => {
            const selected = option.value === value;

            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => chooseOption(option.value)}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left font-bold transition ${
                  selected
                    ? `border-pink-300/50 bg-gradient-to-r ${accentClass} text-white`
                    : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
                }`}
              >
                <span>{option.label}</span>
                {selected && <Check className="h-5 w-5 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={cleanText(ariaLabel || title)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b1022] p-3 text-left text-white outline-none transition hover:border-pink-300/40 ${className}`}
      >
        <span className="min-w-0 truncate">{selectedOption?.label || title}</span>
        <ChevronDown className="h-5 w-5 shrink-0 text-white/45" aria-hidden="true" />
      </button>

      {menu && createPortal(menu, document.body)}
    </>
  );
}
