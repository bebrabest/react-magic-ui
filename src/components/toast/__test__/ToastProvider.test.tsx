import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ToastProvider, useToast } from "../ToastProvider";

const ToastTrigger: React.FC<{
  onReady?: (api: ReturnType<typeof useToast>) => void;
}> = ({ onReady }) => {
  const toast = useToast();

  React.useEffect(() => {
    onReady?.(toast);
  }, [onReady, toast]);

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          toast.showToast({
            title: "Saved",
            description: "Your changes are live",
          })
        }
      >
        show default toast
      </button>
      <button
        type="button"
        onClick={() =>
          toast.showToast({
            id: "danger-toast",
            title: "Failed",
            variant: "error",
            duration: Infinity,
            animation: "scale",
            position: "bottom-left",
          })
        }
      >
        show sticky toast
      </button>
    </div>
  );
};

afterEach(() => {
  cleanup();
});

describe("ToastProvider", () => {
  it("renders a toast through the provider", async () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /show default toast/i }));

    const status = await screen.findByRole("status");

    expect(status).toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Your changes are live")).toBeInTheDocument();
    expect(document.body).toContainElement(status);
  });

  it("dismisses a specific sticky toast through the context api", async () => {
    let toastApi: ReturnType<typeof useToast> | undefined;

    render(
      <ToastProvider>
        <ToastTrigger onReady={(api) => {
          toastApi = api;
        }} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /show sticky toast/i }));

    expect(await screen.findByText("Failed")).toBeInTheDocument();

    act(() => {
      toastApi?.dismissToast("danger-toast");
    });

    await waitFor(() => {
      expect(screen.queryByText("Failed")).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it("clears all visible toasts", async () => {
    let toastApi: ReturnType<typeof useToast> | undefined;

    render(
      <ToastProvider>
        <ToastTrigger onReady={(api) => {
          toastApi = api;
        }} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /show default toast/i }));
    fireEvent.click(screen.getByRole("button", { name: /show sticky toast/i }));

    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();

    act(() => {
      toastApi?.clearToasts();
    });

    await waitFor(() => {
      expect(screen.queryByText("Saved")).not.toBeInTheDocument();
      expect(screen.queryByText("Failed")).not.toBeInTheDocument();
    }, { timeout: 1500 });
  });

  it("calls onClose when the close button is pressed", async () => {
    const onClose = vi.fn();

    const CloseButtonCase = () => {
      const toast = useToast();

      return (
        <button
          type="button"
          onClick={() =>
            toast.showToast({
              title: "Closable",
              duration: Infinity,
              animation: "slide-from-right",
              onClose,
            })
          }
        >
          show closable toast
        </button>
      );
    };

    render(
      <ToastProvider>
        <CloseButtonCase />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /show closable toast/i }));

    expect(await screen.findByText("Closable")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close toast/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("Closable")).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });
});
