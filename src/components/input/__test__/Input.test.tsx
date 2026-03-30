import React, { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Input from "../Input";

describe("Input component", () => {
  it("renders a text input by default and forwards common input props", () => {
    render(
      <Input
        aria-label="Email"
        placeholder="name@example.com"
        defaultValue="hello"
        data-testid="email-input"
      />,
    );

    const input = screen.getByRole("textbox", { name: "Email" });

    expect(input).toHaveAttribute("placeholder", "name@example.com");
    expect(input).toHaveValue("hello");
    expect(screen.getByTestId("email-input")).toBe(input);
  });

  it("respects disabled state and still exposes native semantics", () => {
    render(<Input aria-label="Disabled input" disabled />);

    expect(screen.getByRole("textbox", { name: "Disabled input" })).toBeDisabled();
  });

  it("fires onChange for typed values", () => {
    const handleChange = vi.fn();

    render(<Input aria-label="Name" onChange={handleChange} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "Vova" },
    });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange.mock.calls[0][0].target).toHaveValue("Vova");
  });

  it("forwards refs to the underlying input element", () => {
    const ref = createRef<HTMLInputElement>();

    render(<Input aria-label="Search" ref={ref} />);

    expect(ref.current).toBe(screen.getByRole("textbox", { name: "Search" }));
  });

  it("honors non-text input types instead of forcing text", () => {
    render(<Input aria-label="Password" type="password" defaultValue="secret" />);

    const input = screen.getByLabelText("Password");

    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveValue("secret");
  });
});
