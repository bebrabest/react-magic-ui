import React, { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Glass from "../Glass";

describe("Glass component", () => {
  it("renders children in the default div surface", () => {
    render(<Glass>Magic surface</Glass>);

    expect(screen.getByText("Magic surface")).toBeInTheDocument();
  });

  it("supports polymorphic rendering via the as prop", () => {
    render(
      <Glass as="button" type="button">
        Open panel
      </Glass>,
    );

    expect(screen.getByRole("button", { name: "Open panel" })).toBeInTheDocument();
  });

  it("forwards refs to the rendered content element", () => {
    const ref = createRef<HTMLButtonElement>();

    render(
      <Glass as="button" type="button" ref={ref}>
        Focus target
      </Glass>,
    );

    expect(ref.current).toBe(screen.getByRole("button", { name: "Focus target" }));
  });

  it("calls the consumer onClick handler and renders a ripple when liquid animation is enabled", () => {
    const handleClick = vi.fn();

    render(
      <Glass as="button" type="button" enableLiquidAnimation onClick={handleClick}>
        Animate me
      </Glass>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Animate me" }), {
      clientX: 20,
      clientY: 20,
    });

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll("[class*='glassRipple']")).toHaveLength(1);
  });

  it("renders a centered ripple for programmatic triggerAnimation", () => {
    const { container } = render(<Glass triggerAnimation>Triggered</Glass>);

    const ripple = container.querySelector("[class*='glassRipple']") as HTMLElement | null;

    expect(ripple).not.toBeNull();
    expect(ripple).toHaveStyle({ left: "50%", top: "50%" });
  });
});
