import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  durationMs: number;
};

type ToastApi = {
  success: (message: string, opts?: { title?: string; durationMs?: number }) => void;
  error: (message: string, opts?: { title?: string; durationMs?: number }) => void;
  info: (message: string, opts?: { title?: string; durationMs?: number }) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, number>>({});

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current[id];
    if (t) window.clearTimeout(t);
    delete timers.current[id];
  }, []);

  const push = useCallback(
    (type: ToastType, message: string, opts?: { title?: string; durationMs?: number }) => {
      const id = uid();
      const durationMs = opts?.durationMs ?? 3500;
      const toast: ToastItem = { id, type, title: opts?.title, message, durationMs };

      setItems((prev) => [toast, ...prev].slice(0, 5));

      timers.current[id] = window.setTimeout(() => remove(id), durationMs);
    },
    [remove]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m, o) => push("success", m, o),
      error: (m, o) => push("error", m, o),
      info: (m, o) => push("info", m, o),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-[360px] max-w-[90vw]">
        {items.map((t) => (
          <div
            key={t.id}
            className={[
              "rounded-2xl border backdrop-blur bg-black/60 shadow-panel p-4",
              "animate-[toastIn_180ms_ease-out]",
              t.type === "success" ? "border-emerald-400/20" : "",
              t.type === "error" ? "border-red-400/20" : "",
              t.type === "info" ? "border-white/10" : "",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <div
                className={[
                  "mt-0.5 h-2.5 w-2.5 rounded-full",
                  t.type === "success" ? "bg-emerald-400" : "",
                  t.type === "error" ? "bg-red-400" : "",
                  t.type === "info" ? "bg-cyan-300" : "",
                ].join(" ")}
              />
              <div className="flex-1">
                {t.title && <div className="text-sm font-semibold">{t.title}</div>}
                <div className="text-sm text-zinc-200">{t.message}</div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  {t.type.toUpperCase()}
                </div>
              </div>

              <button
                className="text-zinc-400 hover:text-zinc-200 text-sm"
                onClick={() => remove(t.id)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
