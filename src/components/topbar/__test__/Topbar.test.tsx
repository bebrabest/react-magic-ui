import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Topbar from "../Topbar";

describe("Topbar component", () => {
  it("renders as a header landmark with brand and actions content", () => {
    render(
      <Topbar aria-label="Primary topbar">
        <Topbar.Section>
          <Topbar.Brand title="Magic UI" subtitle="Component library" />
        </Topbar.Section>
        <Topbar.Actions>
          <button type="button">Search</button>
          <button type="button">Profile</button>
        </Topbar.Actions>
      </Topbar>,
    );

    expect(
      screen.getByRole("banner", { name: "Primary topbar" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Magic UI")).toBeInTheDocument();
    expect(screen.getByText("Component library")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Profile" })).toBeInTheDocument();
  });

  it("renders custom brand children instead of generated title/subtitle content", () => {
    render(
      <Topbar>
        <Topbar.Brand title="Should not render" subtitle="Also hidden">
          <a href="/dashboard">Custom brand</a>
        </Topbar.Brand>
      </Topbar>,
    );

    expect(screen.getByRole("link", { name: "Custom brand" })).toBeInTheDocument();
    expect(screen.queryByText("Should not render")).not.toBeInTheDocument();
    expect(screen.queryByText("Also hidden")).not.toBeInTheDocument();
  });

  it("lets Topbar.Actions inherit section behavior while keeping right-aligned content accessible", () => {
    render(
      <Topbar>
        <Topbar.Actions data-testid="actions" gap="relaxed">
          <button type="button">Notifications</button>
        </Topbar.Actions>
      </Topbar>,
    );

    expect(screen.getByTestId("actions")).toContainElement(
      screen.getByRole("button", { name: "Notifications" }),
    );
  });

  it("throws when compound subcomponents that require context are rendered outside Topbar", () => {
    expect(() => render(<Topbar.Brand title="Detached brand" />)).toThrow(
      /Topbar\.Brand must be used within Topbar/,
    );
    expect(() => render(<Topbar.Divider />)).toThrow(
      /Topbar\.Divider must be used within Topbar/,
    );
    expect(() => {
      const DetachedHookConsumer = () => {
        Topbar.useTopbar();
        return null;
      };

      render(<DetachedHookConsumer />);
    }).toThrow(/Topbar\.useTopbar must be used within Topbar/);
  });
});
