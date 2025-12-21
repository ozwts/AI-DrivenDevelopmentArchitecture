import {
  useEffect,
  createContext,
  useContext,
  forwardRef,
  type ComponentPropsWithoutRef,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { XMarkIcon } from "@heroicons/react/24/outline";

type ModalContextValue = {
  onClose: () => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

const modalVariants = cva(
  "relative w-full bg-white rounded-md shadow-xl transform transition-all",
  {
    variants: {
      size: {
        sm: "max-w-md",
        md: "max-w-lg",
        lg: "max-w-2xl",
        xl: "max-w-4xl",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const headerTitleVariants = cva("text-xl font-semibold text-text-primary");

const headerCloseButtonVariants = cva(
  "text-text-tertiary hover:text-text-secondary transition-colors",
);

const headerCloseIconVariants = cva("h-6 w-6");

type ModalProps = Omit<ComponentPropsWithoutRef<"div">, "className"> &
  VariantProps<typeof modalVariants> & {
    readonly isOpen: boolean;
    readonly onClose: () => void;
  };

const ModalRoot = forwardRef<HTMLDivElement, ModalProps>(
  ({ isOpen, onClose, children, size, ...props }, ref) => {
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
              ref={ref}
              role="dialog"
              aria-modal="true"
              className={modalVariants({ size })}
              {...props}
            >
              {children}
            </div>
          </div>
        </div>
      </ModalContext.Provider>
    );
  },
);

ModalRoot.displayName = "Modal";

// サブコンポーネント: Header
type HeaderProps = Omit<ComponentPropsWithoutRef<"div">, "className">;

const Header = forwardRef<HTMLDivElement, HeaderProps>(
  ({ children, ...props }, ref) => {
    const context = useContext(ModalContext);

    return (
      <div
        ref={ref}
        className="flex items-center justify-between border-b border-border-light px-6 py-4"
        {...props}
      >
        <h2 className={headerTitleVariants()}>{children}</h2>
        {context !== null && (
          <button
            type="button"
            onClick={context.onClose}
            className={headerCloseButtonVariants()}
            aria-label="閉じる"
          >
            <XMarkIcon className={headerCloseIconVariants()} aria-hidden="true" />
          </button>
        )}
      </div>
    );
  },
);

Header.displayName = "Modal.Header";

// サブコンポーネント: Body
type BodyProps = Omit<ComponentPropsWithoutRef<"div">, "className">;

const Body = forwardRef<HTMLDivElement, BodyProps>(
  ({ children, ...props }, ref) => (
    <div ref={ref} className="px-6 py-4" {...props}>
      {children}
    </div>
  ),
);

Body.displayName = "Modal.Body";

// サブコンポーネント: Footer
type FooterProps = Omit<ComponentPropsWithoutRef<"div">, "className">;

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
