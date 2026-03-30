import { ComponentPropsWithoutRef, forwardRef } from "react";
import { cn } from "../../func";
import Glass from "../glass/Glass";
import styles from "./style/Input.module.scss";

export type InputProps = Omit<ComponentPropsWithoutRef<"input">, "size"> & {
  size?: "small" | "medium" | "large";
  enableClickAnimation?: boolean;
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = "medium",
      disabled,
      onChange,
      placeholder,
      enableClickAnimation = true,
      className,
      type = "text",
      ...props
    },
    ref,
  ) => {
    return (
      <Glass enableLiquidAnimation={enableClickAnimation}>
        <input
          ref={ref}
          type={type}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            styles.input,
            styles[size],
            disabled ? styles.disabled : "",
            className,
          )}
          {...props}
        />
      </Glass>
    );
  },
);

Input.displayName = "Input";

export default Input;
