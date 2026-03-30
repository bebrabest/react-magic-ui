import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import Modal, { ModalProps } from "../Modal";

const renderModal = (props?: Partial<ModalProps>) => {
  const onOpenChange = vi.fn();

  const result = render(
    <Modal
      open
      onOpenChange={onOpenChange}
      title="Glass modal"
      description="Keeps the focus on your content."
      footer={<span>Footer actions</span>}
      {...props}
    >
      <button type="button">Primary action</button>
      <button type="button">Secondary action</button>
    </Modal>,
  );

  return {
    ...result,
    onOpenChange,
  };
};

describe("Modal component", () => {
  it("renders dialog content when open", () => {
    renderModal();

    expect(
      screen.getByRole("dialog", { name: "Glass modal" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Primary action")).toBeInTheDocument();
  });

  it("calls onOpenChange when overlay clicked", () => {
    const { onOpenChange } = renderModal();

    const overlay = screen.getByTestId("modal-overlay");
    expect(overlay).toBeInTheDocument();

    fireEvent.click(overlay);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not close when overlay click disabled", () => {
    const { onOpenChange } = renderModal({ closeOnOverlay: false });

    const overlay = screen.getByTestId("modal-overlay");
    expect(overlay).toBeInTheDocument();

    fireEvent.click(overlay);

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("invokes onOpenChange when escape key pressed", () => {
    const { onOpenChange } = renderModal();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders in the body by default", () => {
    render(
      <Modal
        open
        onOpenChange={() => {}}
        title="Glass modal"
        description="Keeps the focus on your content."
      >
        <button type="button">Modal body content</button>
      </Modal>,
    );

    const modalContainer = screen.getByTestId("modal-container");
    expect(modalContainer.parentElement!.tagName).toBe("BODY");
  });

  it("locks body scroll while open and restores on close", () => {
    const { rerender } = render(
      <Modal
        open
        onOpenChange={() => {}}
        title="Glass modal"
        description="Keeps the focus on your content."
      >
        <button type="button">Modal body content</button>
      </Modal>,
    );

    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <Modal
        open={false}
        onOpenChange={() => {}}
        title="Glass modal"
        description="Keeps the focus on your content."
      >
        <button type="button">Modal body content</button>
      </Modal>,
    );

    expect(document.body.style.overflow).toBe("");
  });

  it("moves focus into the modal when opened", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "close modal" })).toHaveFocus();
    });
  });

  it("traps focus within the modal when tabbing forward and backward", async () => {
    const user = userEvent.setup();
    renderModal();

    const closeButton = screen.getByRole("button", { name: "close modal" });
    const primaryAction = screen.getByRole("button", { name: "Primary action" });
    const secondaryAction = screen.getByRole("button", { name: "Secondary action" });

    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    });

    await user.tab();
    expect(primaryAction).toHaveFocus();

    await user.tab();
    expect(secondaryAction).toHaveFocus();

    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(secondaryAction).toHaveFocus();
  });

  it("restores focus to the previously focused element when closed", async () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open modal";
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(
      <Modal
        open
        onOpenChange={() => {}}
        title="Glass modal"
        description="Keeps the focus on your content."
      >
        <button type="button">Modal body content</button>
      </Modal>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "close modal" })).toHaveFocus();
    });

    rerender(
      <Modal
        open={false}
        onOpenChange={() => {}}
        title="Glass modal"
        description="Keeps the focus on your content."
      >
        <button type="button">Modal body content</button>
      </Modal>,
    );

    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
