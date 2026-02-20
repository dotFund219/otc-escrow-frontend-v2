import clsx from "clsx";

export function IconRefreshButton({
  loading,
  onClick,
  title = "Refresh",
}: {
  loading?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      className={clsx("icon-btn", loading && "icon-btn-muted")}
      disabled={!!loading}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        className={clsx("opacity-90", loading && "animate-spin")}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20 12a8 8 0 0 1-14.9 4M4 12A8 8 0 0 1 18.9 8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M18 5v4h-4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 19v-4h4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
