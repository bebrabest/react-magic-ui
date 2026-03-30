import React from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Tabs from "../Tabs";

const renderTabs = (props?: {
  activationMode?: "auto" | "manual";
  orientation?: "horizontal" | "vertical";
  onValueChange?: (next: string) => void;
}) => {
  render(
    <Tabs defaultValue="overview" activationMode={props?.activationMode} orientation={props?.orientation}>
      <Tabs.List>
        <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
        <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
        <Tabs.Trigger value="billing" disabled>
          Billing
        </Tabs.Trigger>
        <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="overview">Overview panel</Tabs.Content>
      <Tabs.Content value="analytics">Analytics panel</Tabs.Content>
      <Tabs.Content value="billing">Billing panel</Tabs.Content>
      <Tabs.Content value="settings">Settings panel</Tabs.Content>
    </Tabs>,
  );
};

describe("Tabs component", () => {
  it("renders tablist/tab/tabpanel semantics for the selected tab", () => {
    renderTabs();

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Overview" })).toHaveTextContent("Overview panel");
    expect(screen.getByText("Analytics panel").closest('[role="tabpanel"]')).toHaveAttribute("hidden");
  });

  it("supports click selection", () => {
    renderTabs();

    fireEvent.click(screen.getByRole("tab", { name: "Analytics" }));

    expect(screen.getByRole("tab", { name: "Analytics" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Analytics" })).not.toHaveAttribute("hidden");
    expect(screen.getByText("Overview panel").closest('[role="tabpanel"]')).toHaveAttribute("hidden");
  });

  it("auto-activates when keyboard navigation moves focus", () => {
    renderTabs({ activationMode: "auto" });

    const overviewTab = screen.getByRole("tab", { name: "Overview" });
    overviewTab.focus();

    fireEvent.keyDown(overviewTab, { key: "ArrowRight" });

    const analyticsTab = screen.getByRole("tab", { name: "Analytics" });

    expect(document.activeElement).toBe(analyticsTab);
    expect(analyticsTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Analytics" })).not.toHaveAttribute("hidden");
  });

  it("keeps focus navigation manual until click in manual activation mode", () => {
    renderTabs({ activationMode: "manual" });

    const overviewTab = screen.getByRole("tab", { name: "Overview" });
    overviewTab.focus();

    fireEvent.keyDown(overviewTab, { key: "ArrowRight" });

    const analyticsTab = screen.getByRole("tab", { name: "Analytics" });

    expect(document.activeElement).toBe(analyticsTab);
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(analyticsTab).toHaveAttribute("aria-selected", "false");

    fireEvent.click(analyticsTab);

    expect(analyticsTab).toHaveAttribute("aria-selected", "true");
  });

  it("skips disabled tabs and supports Home/End navigation", () => {
    renderTabs();

    const analyticsTab = screen.getByRole("tab", { name: "Analytics" });

    act(() => {
      analyticsTab.focus();
      fireEvent.keyDown(analyticsTab, { key: "ArrowRight" });
    });

    const settingsTab = screen.getByRole("tab", { name: "Settings" });
    expect(document.activeElement).toBe(settingsTab);
    expect(settingsTab).toHaveAttribute("aria-selected", "true");

    act(() => {
      fireEvent.keyDown(settingsTab, { key: "Home" });
    });
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Overview" }));

    act(() => {
      fireEvent.keyDown(screen.getByRole("tab", { name: "Overview" }), { key: "End" });
    });
    expect(document.activeElement).toBe(settingsTab);
  });

  it("uses vertical arrow keys when orientation is vertical", () => {
    renderTabs({ orientation: "vertical" });

    const overviewTab = screen.getByRole("tab", { name: "Overview" });
    overviewTab.focus();

    fireEvent.keyDown(overviewTab, { key: "ArrowDown" });

    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Analytics" }));
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
  });

  it("does not select disabled tabs on click", () => {
    renderTabs();

    fireEvent.click(screen.getByRole("tab", { name: "Billing" }));

    expect(screen.getByRole("tab", { name: "Billing" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  });
});
