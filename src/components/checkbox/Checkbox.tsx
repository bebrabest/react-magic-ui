import React, { useId } from "react";
import styles from "./style/Checkbox.module.scss";
import clsx from "clsx";
import Glass, { GlassProps } from "../glass/Glass";

export type CheckboxProps = {
    disabled?: boolean;
    size?: "small" | "medium" | "large";
    checked?: boolean;
    onChange?: (checked: boolean) => void;
    label?: string;
    enableClickAnimation?: boolean;
} & GlassProps;

const Checkbox: React.FC<CheckboxProps> = ({
    size = "medium",
    disabled,
    checked = false,
    onChange,
    label,
    enableClickAnimation = true,
    ...props
}) => {
    const labelId = useId();

    const toggle = () => {
        if (!disabled && onChange) {
            onChange(!checked);
        }
    };

    return (
        <div
            className={clsx(
                styles.checkboxContainer,
                disabled && styles.disabled
            )}
        >
            <Glass
                enableLiquidAnimation={enableClickAnimation}
                as="button"
                type="button"
                role="checkbox"
                aria-checked={checked}
                aria-disabled={disabled}
                aria-labelledby={label ? labelId : undefined}
                onClick={toggle}
                className={clsx(
                    styles.checkbox,
                    styles[size],
                    checked && styles.checked,
                    disabled && styles.disabled
                )}
                rootClassName={clsx(
                    styles.glassRoot,
                    styles[size]
                )}
                disabled={disabled}
                {...props}
            >
                {checked && (
                    <svg
                        className={clsx(styles.checkIcon, "pointer-events-none")}
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M20 6L9 17L4 12"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )}
            </Glass>
            {label && (
                <span id={labelId} className={styles.label} onClick={toggle}>
                    {label}
                </span>
            )}
        </div>
    );
};

export default Checkbox;
