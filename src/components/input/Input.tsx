import React, { ComponentPropsWithoutRef } from "react";
import { cn } from "../../func";
import Glass from "../glass/Glass";
import styles from "./style/Input.module.scss";

export type InputProps = Omit<ComponentPropsWithoutRef<"input">, "size"> & {
  size?: "small" | "medium" | "large";
  enableClickAnimation?: boolean;
};

const Input: React.FC<InputProps> = ({
  size = "medium",
  disabled,
  onChange,
  placeholder,
  enableClickAnimation = true,
  ...props
}) => {
  return (
    <Glass enableLiquidAnimation={enableClickAnimation}>
      <input
        type="text"
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          styles.input,
          styles[size],
          disabled ? styles.disabled : ""
        )}
        {...props}
      />
    </Glass>
  );
};

export default Input;
