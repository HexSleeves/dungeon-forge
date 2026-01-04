import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({
  label,
  error,
  className = "",
  id,
  ...props
}: InputProps): React.ReactElement {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm text-text-secondary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          px-3 py-2 bg-bg-tertiary border border-slate-600 rounded-lg
          text-text-primary placeholder-text-muted
          focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? "border-red-500" : ""}
          ${className}
        `}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
