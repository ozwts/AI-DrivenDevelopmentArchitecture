import {
  ReactNode,
  useEffect,
  createContext,
  useContext,
  forwardRef,
  ComponentPropsWithoutRef,
} from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

type ModalContextValue = {
  onClose: () => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

type ModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly size?: "sm" | "md" | "lg" | "xl";
};

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

const ModalRoot = ({
  isOpen,
  onClose,
  children,
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
    <ModalContext.Provider value={{ onClose }}>
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
            className={`relative w-full bg-white rounded-md shadow-xl transform transition-all ${sizeClasses[size]}`}
          >
            {children}
          </div>
        </div>
      </div>
    </ModalContext.Provider>
  );
};

// サブコンポーネント: Header
type HeaderProps = Omit<ComponentPropsWithoutRef<"div">, "className"> & {
  readonly children: ReactNode;
};

const Header = forwardRef<HTMLDivElement, HeaderProps>(
  ({ children, ...props }, ref) => {
    const context = useContext(ModalContext);

    return (
      <div
        ref={ref}
        className="flex items-center justify-between border-b border-border-light px-6 py-4"
        {...props}
      >
        <h2 className="text-xl font-semibold text-text-primary">{children}</h2>
        {context && (
          <button
            onClick={context.onClose}
            className="text-text-tertiary hover:text-text-secondary transition-colors"
            aria-label="閉じる"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        )}
      </div>
    );
  },
);

Header.displayName = "Modal.Header";

// サブコンポーネント: Body
type BodyProps = Omit<ComponentPropsWithoutRef<"div">, "className"> & {
  readonly children: ReactNode;
};

const Body = forwardRef<HTMLDivElement, BodyProps>(
  ({ children, ...props }, ref) => (
    <div ref={ref} className="px-6 py-4" {...props}>
      {children}
    </div>
  ),
);

Body.displayName = "Modal.Body";

// サブコンポーネント: Footer
type FooterProps = Omit<ComponentPropsWithoutRef<"div">, "className"> & {
  readonly children: ReactNode;
};

const Footer = forwardRef<HTMLDivElement, FooterProps>(
  ({ children, ...props }, ref) => (
    <div
      ref={ref}
      className="flex justify-end gap-2 border-t border-border-light px-6 py-4"
      {...props}
    >
      {children}
    </div>
  ),
);

Footer.displayName = "Modal.Footer";

// Compound Component としてエクスポート
export const Modal = Object.assign(ModalRoot, {
  Header,
  Body,
  Footer,
});
