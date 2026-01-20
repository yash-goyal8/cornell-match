/**
 * Badge Component Tests
 * 
 * Tests for Badge UI component including variants.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/utils";
import { Badge } from "@/components/ui/badge";

describe("Badge Component", () => {
  it("should render badge with text", () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText("Test Badge")).toBeInTheDocument();
  });

  describe("Variants", () => {
    it("should apply default variant", () => {
      render(<Badge variant="default">Default</Badge>);
      const badge = screen.getByText("Default");
      expect(badge).toHaveClass("bg-primary");
    });

    it("should apply secondary variant", () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      const badge = screen.getByText("Secondary");
      expect(badge).toHaveClass("bg-secondary");
    });

    it("should apply destructive variant", () => {
      render(<Badge variant="destructive">Destructive</Badge>);
      const badge = screen.getByText("Destructive");
      expect(badge).toHaveClass("bg-destructive");
    });

    it("should apply outline variant", () => {
      render(<Badge variant="outline">Outline</Badge>);
      const badge = screen.getByText("Outline");
      expect(badge).toHaveClass("text-foreground");
    });
  });

  describe("Styling", () => {
    it("should accept additional className", () => {
      render(<Badge className="custom-class">Custom</Badge>);
      const badge = screen.getByText("Custom");
      expect(badge).toHaveClass("custom-class");
    });

    it("should have rounded styling", () => {
      render(<Badge>Rounded</Badge>);
      const badge = screen.getByText("Rounded");
      expect(badge).toHaveClass("rounded-full");
    });

    it("should have inline-flex display", () => {
      render(<Badge>Flex</Badge>);
      const badge = screen.getByText("Flex");
      expect(badge).toHaveClass("inline-flex");
    });
  });
});
