import React, { forwardRef, ComponentPropsWithoutRef } from "react";
import styles from "./style/Button.module.scss";
import clsx from "clsx";
import Glass, { GlassProps } from "../glass/Glass";

export type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  text?: string;
  children?: React.ReactNode;
  variant?: "default" | "positive" | "negative" | "warning";
  size?: "small" | "medium" | "large";
  enableClickAnimation?: boolean;
  rounded?: boolean;
} & GlassProps<"button">;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  size = "medium",
  variant,
  disabled,
  text,
  children,
  onClick,
  type = "button",
  enableClickAnimation = true,
  rounded = false,
  className,
  ...props
}, ref) => {
  return (
    <Glass
      as="button"
      ref={ref}
      type={type}
      onClick={onClick}
      enableLiquidAnimation={!disabled && enableClickAnimation}
      className={clsx(
        styles.btn,
        variant && `bg-${variant}`,
        styles[size],
        disabled && styles.disabled,
        rounded && styles.rounded,
        className,
      )}
      rootClassName={rounded && styles.roundedRoot}
      disabled={disabled}
      {...props}
    >
      {children ?? text}
    </Glass>
  );
});

Button.displayName = "Button";

export default Button;
