import React from "react";

interface AlertProps {
  variant?: "error" | "warning" | "info";
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
}

export default function Alert({
  variant = "error",
  title,
  children,
  onClose,
}: AlertProps) {
  const variantStyles = {
    error: "bg-red-500/10 border-red-500/50 text-red-300",
    warning: "bg-yellow-500/10 border-yellow-500/50 text-yellow-300",
    info: "bg-blue-500/10 border-blue-500/50 text-blue-300",
  };

  const iconColors = {
    error: "text-red-400",
    warning: "text-yellow-400",
    info: "text-blue-400",
  };

  return (
    <div
      className={`${variantStyles[variant]} border rounded-lg p-3 sm:p-4 mb-4 flex items-start gap-2 sm:gap-3`}
      role="alert"
    >
      <div className={`flex-shrink-0 ${iconColors[variant]}`}>
        {variant === "error" && (
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        {variant === "warning" && (
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )}
        {variant === "info" && (
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className="font-semibold mb-1 text-xs sm:text-sm">{title}</h3>
        )}
        <div className="text-xs sm:text-sm break-words">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Закрыть"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

