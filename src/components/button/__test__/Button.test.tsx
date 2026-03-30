import React, { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Button from "../Button";

describe("Button component", () => {
  it("renders provided text content", () => {
    render(<Button text="press me" />);
    expect(screen.getByRole("button").textContent).toBe("press me");
  });

  it("prefers explicit children over the text prop", () => {
    render(<Button text="fallback text">real child</Button>);

    expect(screen.getByRole("button")).toHaveTextContent("real child");
    expect(screen.getByRole("button")).not.toHaveTextContent("fallback text");
  });

  it("applies default styling when no variant or size provided", () => {
    render(<Button text="default styles" />);
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.className).toContain("btn");
    expect(button.className).toContain("medium");
  });

  it("applies variant and size specific classes", () => {
    render(<Button text="negative" variant="negative" size="small" />);
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.className).toContain("bg-negative");
    expect(button.className).toContain("small");
  });

  it("forwards refs to the underlying native button", () => {
    const ref = createRef<HTMLButtonElement>();

    render(<Button ref={ref} text="focus me" />);

    expect(ref.current).toBe(screen.getByRole("button", { name: "focus me" }));
  });

  it("uses type=button by default", () => {
    render(<Button text="default type" />);

    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("preserves consumer-provided button type", () => {
    render(<Button text="submit" type="submit" />);

    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("calls onClick handler when enabled", () => {
    const handleClick = vi.fn();
    render(<Button text="click" onClick={handleClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", () => {
    const handleClick = vi.fn();
    render(<Button text="disabled" disabled onClick={handleClick} />);
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("disables the liquid click animation when disabled", () => {
    render(
      <Button text="disabled animation" disabled enableClickAnimation />,
    );

    fireEvent.click(screen.getByRole("button"), {
      clientX: 24,
      clientY: 24,
    });

    expect(document.querySelector("[class*='glassRipple']")).toBeNull();
  });

  it("renders a ripple on click when the liquid animation is enabled", () => {
    render(<Button text="animate" enableClickAnimation />);

    fireEvent.click(screen.getByRole("button"), {
      clientX: 24,
      clientY: 24,
    });

    expect(document.querySelectorAll("[class*='glassRipple']")).toHaveLength(1);
  });

  it("applies rounded classes to both button and glass root wrapper", () => {
    const { container } = render(<Button text="rounded" rounded />);
    const button = screen.getByRole("button");
    const root = container.querySelector("[class*='roundedRoot']");

    expect(button.className).toContain("rounded");
    expect(root).not.toBeNull();
  });
});
