import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../func";
import Glass from "../glass/Glass";
import {
  ToastContext,
  type ToastAnimation,
  type ToastContextValue,
  type ToastDefinition,
  type ToastPosition,
  type ToastProviderProps,
  type ToastVariant,
} from "./toast-context";
import styles from "./style/Toast.module.scss";

type ToastRecord = ToastDefinition & {
  id: string;
  createdAt: number;
  dismissed: boolean;
  duration: number;
  animation: ToastAnimation;
  position: ToastPosition;
  variant: ToastVariant;
  enableLiquidAnimation: boolean;
};


const variantClassMap: Record<ToastVariant, string> = {
  default: styles.variantDefault,
  success: styles.variantSuccess,
  error: styles.variantError,
  info: styles.variantInfo,
};

const animationClassMap: Record<ToastAnimation, string> = {
  "slide-from-right": styles.slideFromRight,
  "slide-from-left": styles.slideFromLeft,
  "slide-from-bottom": styles.slideFromBottom,
  scale: styles.scale,
};

const positionClassMap: Record<ToastPosition, string> = {
  "top-right": styles.topRight,
  "top-left": styles.topLeft,
  "top-center": styles.topCenter,
  "bottom-right": styles.bottomRight,
  "bottom-left": styles.bottomLeft,
  "bottom-center": styles.bottomCenter,
};

const animationDurations: Record<ToastAnimation, number> = {
  "slide-from-right": 220,
  "slide-from-left": 220,
  "slide-from-bottom": 240,
  scale: 200,
};

const positionSorts: Record<ToastPosition, "asc" | "desc"> = {
  "top-right": "desc",
  "top-left": "desc",
  "top-center": "desc",
  "bottom-right": "asc",
  "bottom-left": "asc",
  "bottom-center": "asc",
};

const generateToastId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
};

const ToastCard: React.FC<{
  toast: ToastRecord;
  onRemove: (id: string) => void;
}> = ({ toast, onRemove }) => {
  const [phase, setPhase] = useState<"initial" | "enter" | "exit">("initial");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closed = useRef(false);
  const titleId = useMemo(() => `toast-title-${toast.id}`, [toast.id]);
  const descriptionId = useMemo(() => `toast-description-${toast.id}`, [toast.id]);

  const animPhaseClass = phase === "initial" ? styles.animInitial : phase === "enter" ? styles.animEnter : styles.animExit;
  const isUrgent = toast.variant === "error";
  const announcementRole = isUrgent ? "alert" : "status";
  const announcementPriority = isUrgent ? "assertive" : "polite";

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setPhase((currentPhase) => (currentPhase === "initial" ? "enter" : currentPhase));
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (toast.duration === Infinity) {
      return;
    }

    closeTimer.current = setTimeout(() => {
      setPhase("exit");
    }, toast.duration);

    return () => {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
      }
    };
  }, [toast.duration]);

  useEffect(() => {
    if (!toast.dismissed) {
      return;
    }

    setPhase("exit");
  }, [toast.dismissed]);

  useEffect(() => {
    if (phase !== "exit") {
      return;
    }

    if (!closed.current) {
      closed.current = true;
      toast.onClose?.();
    }

    removeTimer.current = setTimeout(() => {
      onRemove(toast.id);
    }, animationDurations[toast.animation]);

    return () => {
      if (removeTimer.current) {
        clearTimeout(removeTimer.current);
      }
    };
  }, [onRemove, phase, toast]);

  const animationClass = animationClassMap[toast.animation];

  const handleDismiss = useCallback(() => {
    setPhase("exit");
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleDismiss();
    }
  }, [handleDismiss]);

  return (
    <Glass
      role={announcementRole}
      aria-live={announcementPriority}
      aria-atomic="true"
      aria-labelledby={toast.title ? titleId : undefined}
      aria-describedby={toast.description ? descriptionId : undefined}
      tabIndex={0}
      enableLiquidAnimation={toast.enableLiquidAnimation}
      triggerAnimation={phase === "enter"}
      onKeyDown={handleKeyDown}
      rootClassName={cn(
        styles.toastCard,
        variantClassMap[toast.variant],
        animationClass,
        animPhaseClass,
      )}
    >
      <div className={styles.toastContent}>
        <div className={styles.toastInner}>
          <div className={styles.toastTextContainer}>
            {toast.title && (
              <p id={titleId} className={styles.toastTitle}>
                {toast.title}
              </p>
            )}
            {toast.description && (
              <p id={descriptionId} className={styles.toastDescription}>
                {toast.description}
              </p>
            )}
          </div>

          <button
            type="button"
            aria-label="close toast"
            className={styles.toastCloseButton}
            onClick={handleDismiss}
          >
            ×
          </button>
        </div>
      </div>
    </Glass>
  );
};

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  duration = 4000,
  animation = "slide-from-right",
  position = "top-right",
  enableLiquidAnimation = true,
  portalContainer,
}) => {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (portalContainer) {
      setPortalNode(portalContainer);
      return;
    }

    if (typeof document !== "undefined") {
      setPortalNode(document.body);
    }
  }, [portalContainer]);

  const showToast = useCallback(
    (toast: ToastDefinition) => {
      const id = toast.id ?? generateToastId();
      setToasts((prev) => [
        ...prev,
        {
          id,
          title: toast.title,
          description: toast.description,
          variant: toast.variant ?? "default",
          duration: toast.duration ?? duration,
          animation: toast.animation ?? animation,
          position: toast.position ?? position,
          enableLiquidAnimation: toast.enableLiquidAnimation ?? enableLiquidAnimation,
          onClose: toast.onClose,
          createdAt: Date.now(),
          dismissed: false,
        },
      ]);

      return id;
    },
    [animation, duration, position, enableLiquidAnimation],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === id
          ? {
            ...toast,
            dismissed: true,
          }
          : toast,
      ),
    );
  }, []);

  const clearToasts = useCallback(() => {
    setToasts((prev) =>
      prev.map((toast) => ({
        ...toast,
        dismissed: true,
      })),
    );
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      showToast,
      dismissToast,
      clearToasts,
      defaults: {
        duration,
        animation,
        position,
        enableLiquidAnimation,
      },
    }),
    [animation, clearToasts, dismissToast, duration, position, enableLiquidAnimation, showToast],
  );

  const toastsByPosition = useMemo(() => {
    return toasts.reduce<Record<ToastPosition, ToastRecord[]>>(
      (acc, toast) => {
        if (!acc[toast.position]) {
          acc[toast.position] = [];
        }
        acc[toast.position].push(toast);
        return acc;
      },
      {
        "top-left": [],
        "top-right": [],
        "top-center": [],
        "bottom-left": [],
        "bottom-right": [],
        "bottom-center": [],
      },
    );
  }, [toasts]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {portalNode &&
        createPortal(
          <>
            {(
              Object.entries(toastsByPosition) as [
                ToastPosition,
                ToastRecord[],
              ][]
            ).map(([toastPosition, items]) => {
              if (!items.length) {
                return null;
              }

              const config = positionSorts[toastPosition];

              const ordered =
                config === "desc"
                  ? [...items].sort((a, b) => b.createdAt - a.createdAt)
                  : [...items].sort((a, b) => a.createdAt - b.createdAt);

              return (
                <div key={toastPosition} className={cn(styles.toastContainer, positionClassMap[toastPosition])}>
                  {ordered.map((toast) => (
                    <ToastCard
                      key={toast.id}
                      toast={toast}
                      onRemove={removeToast}
                    />
                  ))}
                </div>
              );
            })}
          </>,
          portalNode,
        )}
    </ToastContext.Provider>
  );
};


