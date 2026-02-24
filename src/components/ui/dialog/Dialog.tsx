import {
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";

type DialogProps = {
  open: boolean;
  title?: ReactNode;
  description?: ReactNode;
  onClose: () => void;

  /** optional footer area (buttons etc.) */
  footer?: ReactNode;

  /** width preset */
  size?: "sm" | "md" | "lg";

  /** disable close by clicking backdrop */
  disableBackdropClose?: boolean;

  /** disable close by ESC */
  disableEscClose?: boolean;
};

function sizeClass(size: DialogProps["size"]) {
  switch (size) {
    case "sm":
      return "max-w-[420px]";
    case "lg":
      return "max-w-[900px]";
    case "md":
    default:
      return "max-w-[620px]";
  }
}

export function Dialog({
  open,
  title,
  description,
  onClose,
  footer,
  size = "md",
  disableBackdropClose,
  disableEscClose,
  children,
}: PropsWithChildren<DialogProps>) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // ESC close
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (disableEscClose) return;
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, disableEscClose]);

  // body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // focus first element
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const root = panelRef.current;
      if (!root) return;
      const el = root.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      el?.focus?.();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const node = (
    <div
      className="
        fixed inset-0 z-[1000]
        flex items-center justify-center
        px-4 py-6
      "
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="
          absolute inset-0
          bg-black/70
          backdrop-blur-[2px]
        "
        onMouseDown={() => {
          if (disableBackdropClose) return;
          onClose();
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`
          relative w-full ${sizeClass(size)}
          rounded-2xl
          border border-white/10
          bg-gradient-to-b from-white/7 to-white/[0.03]
          shadow-panel
          overflow-hidden
        `}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || description) && (
          <div className="px-5 pt-5 pb-3 border-b border-white/10">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {title && (
                  <div className="text-lg font-semibold leading-snug">
                    {title}
                  </div>
                )}
                {description && (
                  <div className="text-sm muted mt-1">{description}</div>
                )}
              </div>

              <button
                className="btn !px-3 !py-2"
                onClick={onClose}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="px-5 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-white/10 bg-black/10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
