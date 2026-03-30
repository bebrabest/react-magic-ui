import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Checkbox from "../Checkbox";

describe("Checkbox component", () => {
  it("exposes checkbox semantics and checked state", () => {
    render(<Checkbox label="Accept terms" checked />);

    expect(screen.getByRole("checkbox", { name: /accept terms/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("toggles through onChange when clicked", () => {
    const onChange = vi.fn();

    render(<Checkbox label="Accept terms" checked={false} onChange={onChange} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /accept terms/i }));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("toggles when the label is clicked", () => {
    const onChange = vi.fn();

    render(<Checkbox label="Accept terms" checked={false} onChange={onChange} />);

    fireEvent.click(screen.getByText("Accept terms"));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does not toggle when disabled", () => {
    const onChange = vi.fn();

    render(<Checkbox label="Accept terms" checked={false} disabled onChange={onChange} />);

    const checkbox = screen.getByRole("checkbox", { name: /accept terms/i });

    expect(checkbox).toBeDisabled();
    expect(checkbox).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(checkbox);
    fireEvent.click(screen.getByText("Accept terms"));

    expect(onChange).not.toHaveBeenCalled();
  });
});
