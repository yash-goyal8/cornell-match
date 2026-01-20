/**
 * Input Component Tests
 * 
 * Tests for Input UI component including accessibility and states.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/utils";
import { Input } from "@/components/ui/input";

describe("Input Component", () => {
  describe("Rendering", () => {
    it("should render input element", () => {
      render(<Input />);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("should render with placeholder", () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
    });

    it("should render with default value", () => {
      render(<Input defaultValue="Default" />);
      expect(screen.getByRole("textbox")).toHaveValue("Default");
    });
  });

  describe("Types", () => {
    it("should support text type", () => {
      render(<Input type="text" data-testid="input" />);
      expect(screen.getByTestId("input")).toHaveAttribute("type", "text");
    });

    it("should support email type", () => {
      render(<Input type="email" data-testid="input" />);
      expect(screen.getByTestId("input")).toHaveAttribute("type", "email");
    });

    it("should support password type", () => {
      render(<Input type="password" data-testid="input" />);
      expect(screen.getByTestId("input")).toHaveAttribute("type", "password");
    });

    it("should support number type", () => {
      render(<Input type="number" data-testid="input" />);
      expect(screen.getByTestId("input")).toHaveAttribute("type", "number");
    });
  });

  describe("Interactions", () => {
    it("should handle onChange events", () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "test" },
      });
      expect(handleChange).toHaveBeenCalled();
    });

    it("should update value on change", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "new value" } });
      expect(input).toHaveValue("new value");
    });

    it("should handle onFocus events", () => {
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} />);
      fireEvent.focus(screen.getByRole("textbox"));
      expect(handleFocus).toHaveBeenCalled();
    });

    it("should handle onBlur events", () => {
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} />);
      fireEvent.blur(screen.getByRole("textbox"));
      expect(handleBlur).toHaveBeenCalled();
    });
  });

  describe("States", () => {
    it("should be disabled when disabled prop is true", () => {
      render(<Input disabled />);
      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    it("should not accept input when disabled", () => {
      render(<Input disabled defaultValue="initial" />);
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "changed" } });
      expect(input).toHaveValue("initial");
    });

    it("should be required when required prop is true", () => {
      render(<Input required />);
      expect(screen.getByRole("textbox")).toBeRequired();
    });

    it("should be readonly when readOnly prop is true", () => {
      render(<Input readOnly defaultValue="readonly" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("readonly");
    });
  });

  describe("Styling", () => {
    it("should accept additional className", () => {
      render(<Input className="custom-input" data-testid="input" />);
      expect(screen.getByTestId("input")).toHaveClass("custom-input");
    });

    it("should have default styling classes", () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId("input");
      expect(input).toHaveClass("flex");
      expect(input).toHaveClass("rounded-md");
    });
  });

  describe("Accessibility", () => {
    it("should be focusable", () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId("input");
      input.focus();
      expect(document.activeElement).toBe(input);
    });

    it("should support aria-label", () => {
      render(<Input aria-label="Email address" />);
      expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    });

    it("should support aria-describedby", () => {
      render(
        <>
          <Input aria-describedby="helper-text" data-testid="input" />
          <span id="helper-text">Enter your email</span>
        </>
      );
      expect(screen.getByTestId("input")).toHaveAttribute(
        "aria-describedby",
        "helper-text"
      );
    });
  });
});
