type LoadingSpinnerProps = {
  readonly size?: "sm" | "md" | "lg";
  readonly className?: string;
};

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export const LoadingSpinner = ({
  size = "md",
  className = "",
}: LoadingSpinnerProps) => {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
      aria-label="読み込み中"
    >
      <div
        className={`
          animate-spin rounded-full
          border-4 border-neutral-200
          border-t-secondary-600
          ${sizeClasses[size]}
        `}
      />
    </div>
  );
};

export const LoadingPage = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-neutral-600">読み込み中...</p>
      </div>
    </div>
  );
};
