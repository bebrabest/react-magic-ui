import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import Sidebar, { SidebarProps } from "../Sidebar";

const renderSidebar = (props?: Partial<SidebarProps>) => {
  return render(
    <Sidebar collapsible {...props}>
      <Sidebar.Header>
        <span>Magic UI</span>
        <Sidebar.Toggle />
      </Sidebar.Header>

      <Sidebar.Items>
        <Sidebar.Item itemId="dashboard">Dashboard</Sidebar.Item>
        <Sidebar.Item itemId="analytics" badge={4}>
          Analytics
        </Sidebar.Item>
        <Sidebar.Item itemId="settings">Settings</Sidebar.Item>
      </Sidebar.Items>
    </Sidebar>,
  );
};

describe("Sidebar component", () => {
  it("renders provided items", () => {
    renderSidebar();

    expect(
      screen.getByRole("button", { name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Analytics" }),
    ).toBeInTheDocument();
  });

  it("fires onSelectItem with item data", () => {
    const handleSelect = vi.fn();
    renderSidebar({ onSelectItem: handleSelect });

    fireEvent.click(screen.getByRole("button", { name: "Analytics" }));

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(
      "analytics",
      expect.any(Object),
    );
  });

  it("does not trigger selection for disabled items", () => {
    const handleSelect = vi.fn();

    render(
      <Sidebar collapsible onSelectItem={handleSelect}>
        <Sidebar.Items>
          <Sidebar.Item itemId="ready">Ready</Sidebar.Item>
          <Sidebar.Item itemId="blocked" disabled>
            Blocked
          </Sidebar.Item>
        </Sidebar.Items>
      </Sidebar>,
    );

    const blocked = screen.getByRole("button", { name: "Blocked" });

    expect(blocked).toBeDisabled();
    fireEvent.click(blocked);
    expect(handleSelect).not.toHaveBeenCalled();
  });

  it("calls onToggle when collapsible header toggle clicked", () => {
    const handleToggle = vi.fn();
    renderSidebar({ collapsed: false, onToggle: handleToggle });

    const toggle = screen.getByRole("button", { name: "collapse sidebar" });

    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);

    expect(handleToggle).toHaveBeenCalledWith(true);
  });

  it("reflects collapsed state via aria-expanded on the toggle", () => {
    renderSidebar({ collapsed: true });

    expect(
      screen.getByRole("button", { name: "expand sidebar" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("supports arrow/home/end keyboard navigation across enabled items", async () => {
    const user = userEvent.setup();

    render(
      <Sidebar collapsible>
        <Sidebar.Items>
          <Sidebar.Item itemId="dashboard">Dashboard</Sidebar.Item>
          <Sidebar.Item itemId="analytics" disabled>
            Analytics
          </Sidebar.Item>
          <Sidebar.Item itemId="settings">Settings</Sidebar.Item>
          <Sidebar.Item itemId="billing">Billing</Sidebar.Item>
        </Sidebar.Items>
      </Sidebar>,
    );

    const dashboard = screen.getByRole("button", { name: "Dashboard" });
    const settings = screen.getByRole("button", { name: "Settings" });
    const billing = screen.getByRole("button", { name: "Billing" });

    dashboard.focus();
    await user.keyboard("{ArrowDown}");
    expect(settings).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(billing).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(settings).toHaveFocus();

    await user.keyboard("{Home}");
    expect(dashboard).toHaveFocus();

    await user.keyboard("{End}");
    expect(billing).toHaveFocus();
  });

  it("marks the active item with aria-current", () => {
    renderSidebar({ activeItemId: "analytics" });

    expect(screen.getByRole("button", { name: "Analytics" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});

