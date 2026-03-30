import React, {
  ComponentPropsWithoutRef,
  KeyboardEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./style/Slider.module.scss";
import clsx from "clsx";

export type SliderProps = ComponentPropsWithoutRef<"div"> & {
  disabled?: boolean;
  size?: "small" | "medium" | "large";
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onChange?: (value: number) => void;
  showValue?: boolean;
  enableClickAnimation?: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const roundToStep = (value: number, min: number, step: number) => {
  if (step <= 0) return value;
  const steps = Math.round((value - min) / step);
  return min + steps * step;
};

const Slider: React.FC<SliderProps> = ({
  size = "medium",
  disabled,
  min = 0,
  max = 100,
  step = 1,
  value = 50,
  onChange,
  showValue = false,
  enableClickAnimation = true,
  className,
  ...props
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const ariaLabel = props["aria-label"];
  const ariaLabelledBy = props["aria-labelledby"];
  const ariaValueText = props["aria-valuetext"];

  const safeMax = max >= min ? max : min;
  const safeStep = step > 0 ? step : 1;
  const currentValue = clamp(value, min, safeMax);
  const range = safeMax - min;
  const percentage = range === 0 ? 0 : ((currentValue - min) / range) * 100;

  const emitValue = useCallback(
    (nextValue: number) => {
      const normalizedValue = clamp(roundToStep(nextValue, min, safeStep), min, safeMax);

      if (onChange && normalizedValue !== currentValue) {
        onChange(normalizedValue);
      }
    },
    [currentValue, min, onChange, safeMax, safeStep],
  );

  const updateValueFromClientX = useCallback(
    (clientX: number) => {
      if (!sliderRef.current || disabled) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const width = rect.width;

      if (width <= 0) {
        return;
      }

      const offsetX = clientX - rect.left;
      const nextPercentage = clamp(offsetX / width, 0, 1);
      const nextValue = min + nextPercentage * range;

      emitValue(nextValue);
    },
    [disabled, emitValue, min, range],
  );

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    setIsDragging(true);
    updateValueFromClientX(event.clientX);
  };

  const handleMouseMove = useCallback(
    (event: globalThis.MouseEvent) => {
      if (isDragging && !disabled) {
        updateValueFromClientX(event.clientX);
      }
    },
    [disabled, isDragging, updateValueFromClientX],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    let nextValue: number | null = null;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        event.preventDefault();
        nextValue = currentValue - safeStep;
        break;
      case "ArrowRight":
      case "ArrowUp":
        event.preventDefault();
        nextValue = currentValue + safeStep;
        break;
      case "PageDown":
        event.preventDefault();
        nextValue = currentValue - safeStep * 10;
        break;
      case "PageUp":
        event.preventDefault();
        nextValue = currentValue + safeStep * 10;
        break;
      case "Home":
        event.preventDefault();
        nextValue = min;
        break;
      case "End":
        event.preventDefault();
        nextValue = safeMax;
        break;
      default:
        break;
    }

    if (nextValue !== null) {
      emitValue(nextValue);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, isDragging]);

  return (
    <div
      className={clsx(
        styles.sliderContainer,
        styles[size],
        disabled && styles.disabled,
        className,
      )}
      {...props}
    >
      <div
        ref={sliderRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-valuetext={ariaValueText}
        aria-disabled={disabled ? "true" : undefined}
        aria-valuemin={min}
        aria-valuemax={safeMax}
        aria-valuenow={currentValue}
        aria-orientation="horizontal"
        className={clsx(styles.sliderTrack, styles[size])}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
      >
        <div className={clsx(styles.trackBackground, styles[size])}>
          <div
            className={styles.trackFill}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div
          className={clsx(styles.thumb, isDragging && styles.dragging)}
          style={{ left: `${percentage}%` }}
        />
      </div>
      {showValue && <span>{currentValue}</span>}
    </div>
  );
};

export default Slider;
