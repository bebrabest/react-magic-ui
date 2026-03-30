import { PropsWithChildren, ReactNode, createContext } from "react";

type ToastVariant = "default" | "success" | "error" | "info";

type ToastAnimation =
  | "slide-from-right"
  | "slide-from-left"
  | "slide-from-bottom"
  | "scale";

type ToastPosition =
  | "top-right"
  | "top-left"
  | "top-center"
  | "bottom-right"
  | "bottom-left"
  | "bottom-center";

export type ToastDefinition = {
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  variant?: ToastVariant;
  duration?: number;
  animation?: ToastAnimation;
  position?: ToastPosition;
  enableLiquidAnimation?: boolean;
  onClose?: () => void;
};

export type ToastProviderProps = PropsWithChildren<{
  duration?: number;
  animation?: ToastAnimation;
  position?: ToastPosition;
  enableLiquidAnimation?: boolean;
  portalContainer?: HTMLElement | null;
}>;

export type ToastContextValue = {
  showToast: (toast: ToastDefinition) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  defaults: {
    duration: number;
    animation: ToastAnimation;
    position: ToastPosition;
    enableLiquidAnimation: boolean;
  };
};

export const ToastContext = createContext<ToastContextValue | null>(null);
export type { ToastAnimation, ToastPosition, ToastVariant };
