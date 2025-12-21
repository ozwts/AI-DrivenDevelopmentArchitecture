import { ReactNode, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

type ModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly size?: "sm" | "md" | "lg" | "xl";
};

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: ModalProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className={`
            relative w-full ${sizeClasses[size]}
            bg-white rounded-md shadow-xl
            transform transition-all
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-light px-6 py-4">
            <h2
              id="modal-title"
              className="text-xl font-semibold text-text-primary"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-text-tertiary hover:text-text-secondary transition-colors"
              aria-label="閉じる"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Body */}
          {children}

          {/* Footer */}
          {footer && (
            <div className="border-t border-border-light">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
