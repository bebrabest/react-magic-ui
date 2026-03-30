import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Switch from "../Switch";

describe("Switch component", () => {
  it("exposes switch semantics and active state", () => {
    render(<Switch label="Email alerts" isActive />);

    expect(screen.getByRole("switch", { name: /email alerts/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("toggles through setIsActive when clicked", () => {
    const setIsActive = vi.fn();

    render(<Switch label="Email alerts" isActive={false} setIsActive={setIsActive} />);

    fireEvent.click(screen.getByRole("switch", { name: /email alerts/i }));

    expect(setIsActive).toHaveBeenCalledWith(true);
  });

  it("toggles when the label is clicked", () => {
    const setIsActive = vi.fn();

    render(<Switch label="Email alerts" isActive={false} setIsActive={setIsActive} />);

    fireEvent.click(screen.getByText("Email alerts"));

    expect(setIsActive).toHaveBeenCalledWith(true);
  });

  it("does not toggle when disabled", () => {
    const setIsActive = vi.fn();

    render(<Switch label="Email alerts" isActive={false} disabled setIsActive={setIsActive} />);

    const toggle = screen.getByRole("switch", { name: /email alerts/i });

    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(toggle);
    fireEvent.click(screen.getByText("Email alerts"));

    expect(setIsActive).not.toHaveBeenCalled();
  });
});
