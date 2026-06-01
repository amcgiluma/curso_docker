import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // El portapapeles puede estar bloqueado en contextos no seguros.
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="rounded-md border border-ink-600 bg-ink-700/60 px-2 py-1 text-xs font-medium text-slate-300 transition hover:border-ocean-500 hover:text-white"
      aria-label="Copiar al portapapeles"
    >
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}
