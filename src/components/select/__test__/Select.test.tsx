import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Select from "../Select";

const options = [
  { value: "kyiv", label: "Kyiv" },
  { value: "lviv", label: "Lviv" },
  { value: "odesa", label: "Odesa" },
];

describe("Select component", () => {
  it("renders placeholder until a value is selected", () => {
    render(<Select options={options} placeholder="Pick a city" />);

    expect(
      screen.getByRole("combobox", { name: /pick a city/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pick a city")).toBeInTheDocument();
  });

  it("opens the listbox and selects an option on click", () => {
    const onChange = vi.fn();

    render(<Select options={options} placeholder="Pick a city" onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox", { name: /pick a city/i }));

    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: "Lviv" }));

    expect(onChange).toHaveBeenCalledWith("lviv");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes when clicking outside", () => {
    render(<Select options={options} placeholder="Pick a city" />);

    fireEvent.click(screen.getByRole("combobox", { name: /pick a city/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("supports keyboard navigation and enter-to-select", () => {
    const onChange = vi.fn();

    render(
      <Select options={options} value="kyiv" onChange={onChange} placeholder="Pick a city" />,
    );

    const combobox = screen.getByRole("combobox", { name: /kyiv/i });

    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    fireEvent.keyDown(combobox, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("odesa");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("supports Home and End keyboard jumps before selection", () => {
    const onChange = vi.fn();

    render(
      <Select options={options} value="lviv" onChange={onChange} placeholder="Pick a city" />,
    );

    const combobox = screen.getByRole("combobox", { name: /lviv/i });

    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(combobox, { key: "End" });
    fireEvent.keyDown(combobox, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("odesa");

    onChange.mockClear();

    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(combobox, { key: "Home" });
    fireEvent.keyDown(combobox, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("kyiv");
  });

  it("exposes the selected option through option semantics when open", () => {
    render(<Select options={options} value="lviv" />);

    fireEvent.click(screen.getByRole("combobox", { name: /lviv/i }));

    expect(screen.getByRole("option", { name: "Lviv" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("combobox", { name: /lviv/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("does not open or change when disabled", () => {
    const onChange = vi.fn();

    render(
      <Select options={options} disabled onChange={onChange} placeholder="Pick a city" />,
    );

    const combobox = screen.getByRole("combobox", { name: /pick a city/i });
    fireEvent.click(combobox);
    fireEvent.keyDown(combobox, { key: "ArrowDown" });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
