import React, { useId } from "react";
import styles from "./styles/Switch.module.scss";
import clsx from "clsx";
import Glass, { GlassProps } from "../glass/Glass";

export type SwitchProps = {
  disabled?: boolean;
  size?: "small" | "medium" | "large";
  isActive?: boolean;
  enableClickAnimation?: boolean;
  setIsActive?: (isActive: boolean) => void;
  label?: string;
} & GlassProps;

const Switch: React.FC<SwitchProps> = ({
  size = "medium",
  disabled,
  isActive = false,
  setIsActive,
  enableClickAnimation = true,
  label,
  ...props
}) => {
  const labelId = useId();

  const toggle = () => {
    if (!disabled && setIsActive) {
      setIsActive(!isActive);
    }
  };

  return (
    <div className={clsx("inline-flex items-center gap-2", disabled && styles.disabled)}>
      <Glass
        enableLiquidAnimation={enableClickAnimation}
        as="button"
        type="button"
        role="switch"
        aria-checked={isActive}
        aria-disabled={disabled}
        aria-labelledby={label ? labelId : undefined}
        onClick={toggle}
        className={clsx(styles.switch, styles[size], isActive && styles.active, disabled && styles.disabled)}
        rootClassName={clsx(styles[size])}
        rootStyle={{ borderRadius: "999px" }}
        disabled={disabled}
        {...props}
      />
      {label && (
        <span id={labelId} onClick={toggle}>
          {label}
        </span>
      )}
    </div>
  );
};

export default Switch;
