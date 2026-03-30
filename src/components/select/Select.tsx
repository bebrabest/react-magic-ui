import React, { useState, useRef, useEffect, useId, useMemo } from "react";
import styles from "./style/Select.module.scss";
import clsx from "clsx";
import Glass from "../glass/Glass";

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectProps = {
  disabled?: boolean;
  size?: "small" | "medium" | "large";
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  enableClickAnimation?: boolean;
};

const Select: React.FC<SelectProps> = ({
  size = "medium",
  disabled,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  enableClickAnimation = true,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const selectRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const selectedIndex = useMemo(
    () => options.findIndex((opt) => opt.value === value),
    [options, value],
  );
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const activeIndex = highlightedIndex >= 0 ? highlightedIndex : selectedIndex;
  const activeOptionId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  const closeDropdown = () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const openDropdown = () => {
    if (disabled) return;
    setIsOpen(true);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const handleToggle = () => {
    if (disabled) return;

    if (isOpen) {
      closeDropdown();
      return;
    }

    openDropdown();
  };

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    closeDropdown();
    buttonRef.current?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [isOpen, selectedIndex]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || options.length === 0) {
      return;
    }

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        if (!isOpen) {
          openDropdown();
          return;
        }

        setHighlightedIndex((current) => {
          const baseIndex = current >= 0 ? current : selectedIndex >= 0 ? selectedIndex : 0;
          return Math.min(baseIndex + 1, options.length - 1);
        });
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        if (!isOpen) {
          openDropdown();
          return;
        }

        setHighlightedIndex((current) => {
          const baseIndex = current >= 0 ? current : selectedIndex >= 0 ? selectedIndex : 0;
          return Math.max(baseIndex - 1, 0);
        });
        break;
      }
      case "Home": {
        if (!isOpen) return;
        event.preventDefault();
        setHighlightedIndex(0);
        break;
      }
      case "End": {
        if (!isOpen) return;
        event.preventDefault();
        setHighlightedIndex(options.length - 1);
        break;
      }
      case "Enter":
      case " ": {
        event.preventDefault();
        if (!isOpen) {
          openDropdown();
          return;
        }

        const nextIndex = highlightedIndex >= 0 ? highlightedIndex : selectedIndex >= 0 ? selectedIndex : 0;
        const option = options[nextIndex];
        if (option) {
          handleSelect(option.value);
        }
        break;
      }
      case "Escape": {
        if (!isOpen) return;
        event.preventDefault();
        closeDropdown();
        buttonRef.current?.focus();
        break;
      }
      default:
        break;
    }
  };

  return (
    <div
      ref={selectRef}
      className={clsx(
        styles.selectContainer,
        styles[size],
        disabled && styles.disabled,
      )}
      {...props}
    >
      <Glass
        enableLiquidAnimation={enableClickAnimation}
        as="button"
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={clsx(
          styles.selectButton,
          styles[size],
          disabled && styles.disabled,
          isOpen && styles.open,
        )}
        rootClassName={styles.glassRoot}
        disabled={disabled}
        role="combobox"
        aria-label={selectedOption ? selectedOption.label : placeholder}
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-activedescendant={isOpen ? activeOptionId : undefined}
      >
        <span className={clsx(styles.selectedValue, !selectedOption && styles.placeholder)}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={clsx(styles.arrow, isOpen && styles.arrowOpen)}
          width="12"
          height="8"
          viewBox="0 0 12 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M1 1L6 6L11 1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Glass>

      {isOpen && !disabled && (
        <Glass enableLiquidAnimation={false} rootClassName={clsx(styles.dropdown, styles[size])}>
          <div role="listbox" id={listboxId} aria-activedescendant={activeOptionId}>
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;

              return (
                <button
                  key={option.value}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={clsx(
                    styles.option,
                    styles[size],
                    isSelected && styles.selected,
                    isHighlighted && styles.selected,
                  )}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </Glass>
      )}
    </div>
  );
};

export default Select;
