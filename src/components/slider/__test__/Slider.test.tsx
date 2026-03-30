import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Slider from "../Slider";

describe("Slider component", () => {
  it("exposes slider semantics and current value", () => {
    render(<Slider aria-label="Volume" min={0} max={100} value={25} />);

    expect(screen.getByRole("slider", { name: /volume/i })).toHaveAttribute(
      "aria-valuenow",
      "25",
    );
  });

  it("updates through click positioning", () => {
    const onChange = vi.fn();

    render(<Slider aria-label="Volume" min={0} max={100} step={10} value={20} onChange={onChange} />);

    const slider = screen.getByRole("slider", { name: /volume/i });

    Object.defineProperty(slider, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        width: 200,
        top: 0,
        right: 200,
        bottom: 20,
        height: 20,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    fireEvent.mouseDown(slider, { clientX: 150 });

    expect(onChange).toHaveBeenCalledWith(80);
  });

  it("supports keyboard interaction", () => {
    const onChange = vi.fn();

    render(<Slider aria-label="Volume" min={0} max={100} step={5} value={50} onChange={onChange} />);

    const slider = screen.getByRole("slider", { name: /volume/i });

    fireEvent.keyDown(slider, { key: "ArrowRight" });
    fireEvent.keyDown(slider, { key: "PageUp" });
    fireEvent.keyDown(slider, { key: "Home" });
    fireEvent.keyDown(slider, { key: "End" });

    expect(onChange).toHaveBeenNthCalledWith(1, 55);
    expect(onChange).toHaveBeenNthCalledWith(2, 100);
    expect(onChange).toHaveBeenNthCalledWith(3, 0);
    expect(onChange).toHaveBeenNthCalledWith(4, 100);
  });

  it("does not change when disabled", () => {
    const onChange = vi.fn();

    render(
      <Slider aria-label="Volume" min={0} max={100} value={50} disabled onChange={onChange} />,
    );

    const slider = screen.getByRole("slider", { name: /volume/i });

    fireEvent.keyDown(slider, { key: "ArrowRight" });
    fireEvent.mouseDown(slider, { clientX: 180 });

    expect(slider).toHaveAttribute("aria-disabled", "true");
    expect(onChange).not.toHaveBeenCalled();
  });
});
