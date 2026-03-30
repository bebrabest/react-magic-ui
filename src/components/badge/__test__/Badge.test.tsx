import React, { createRef } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge from "../Badge";

describe("Badge component", () => {
  it("renders badge content inside a span", () => {
    render(<Badge>stable</Badge>);

    const badge = screen.getByText("stable");
    expect(badge.tagName).toBe("SPAN");
    expect(badge.className).toContain("badge");
  });

  it("applies the requested variant class", () => {
    render(<Badge variant="info">info badge</Badge>);

    expect(screen.getByText("info badge").className).toContain("bg-info");
  });

  it("renders decorative leading and trailing icons as aria-hidden", () => {
    render(
      <Badge
        leadingIcon={<svg data-testid="leading-icon" />}
        trailingIcon={<svg data-testid="trailing-icon" />}
      >
        updates
      </Badge>,
    );

    expect(screen.getByTestId("leading-icon").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("trailing-icon").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("forwards refs to the rendered badge element", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Badge ref={ref}>ref badge</Badge>);

    expect(ref.current).toBe(screen.getByText("ref badge"));
  });

  it("passes through native span attributes", () => {
    render(
      <Badge data-testid="badge" title="release ready">
        ready
      </Badge>,
    );

    expect(screen.getByTestId("badge")).toHaveAttribute("title", "release ready");
  });
});
