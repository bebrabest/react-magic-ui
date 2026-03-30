import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Card from "../Card";

describe("Card component", () => {
  it("renders children inside the glass-backed surface", () => {
    render(<Card>Card content</Card>);

    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("passes div attributes through to the rendered content element", () => {
    render(
      <Card aria-label="Profile card" data-testid="profile-card">
        Profile
      </Card>,
    );

    expect(screen.getByRole("generic", { name: "Profile card" })).toBe(
      screen.getByTestId("profile-card"),
    );
  });

  it("supports row layout and glass root customization props", () => {
    render(
      <Card
        data-testid="settings-card"
        direction="row"
        rootClassName="custom-root"
        rootStyle={{ padding: "12px" }}
      >
        Settings
      </Card>,
    );

    const card = screen.getByTestId("settings-card");
    const root = card.parentElement;

    expect(card.className).toContain("flexRow");
    expect(root).toHaveClass("custom-root");
    expect(root).toHaveStyle({ padding: "12px" });
  });
});
