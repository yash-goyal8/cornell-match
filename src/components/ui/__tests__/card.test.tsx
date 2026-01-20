/**
 * Card Component Tests
 * 
 * Tests for Card UI components.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

describe("Card Components", () => {
  describe("Card", () => {
    it("should render card container", () => {
      render(<Card data-testid="card">Content</Card>);
      expect(screen.getByTestId("card")).toBeInTheDocument();
    });

    it("should apply default styles", () => {
      render(<Card data-testid="card">Content</Card>);
      const card = screen.getByTestId("card");
      expect(card).toHaveClass("rounded-lg");
      expect(card).toHaveClass("border");
    });

    it("should accept additional className", () => {
      render(
        <Card data-testid="card" className="custom-class">
          Content
        </Card>
      );
      expect(screen.getByTestId("card")).toHaveClass("custom-class");
    });
  });

  describe("CardHeader", () => {
    it("should render card header", () => {
      render(
        <Card>
          <CardHeader data-testid="header">Header Content</CardHeader>
        </Card>
      );
      expect(screen.getByTestId("header")).toBeInTheDocument();
    });

    it("should apply header styles", () => {
      render(
        <Card>
          <CardHeader data-testid="header">Header</CardHeader>
        </Card>
      );
      expect(screen.getByTestId("header")).toHaveClass("flex");
    });
  });

  describe("CardTitle", () => {
    it("should render card title", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
          </CardHeader>
        </Card>
      );
      expect(screen.getByText("Test Title")).toBeInTheDocument();
    });

    it("should apply title styles", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle data-testid="title">Title</CardTitle>
          </CardHeader>
        </Card>
      );
      expect(screen.getByTestId("title")).toHaveClass("font-semibold");
    });
  });

  describe("CardDescription", () => {
    it("should render card description", () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
        </Card>
      );
      expect(screen.getByText("Test Description")).toBeInTheDocument();
    });

    it("should apply description styles", () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription data-testid="desc">Description</CardDescription>
          </CardHeader>
        </Card>
      );
      expect(screen.getByTestId("desc")).toHaveClass("text-muted-foreground");
    });
  });

  describe("CardContent", () => {
    it("should render card content", () => {
      render(
        <Card>
          <CardContent data-testid="content">Main Content</CardContent>
        </Card>
      );
      expect(screen.getByTestId("content")).toBeInTheDocument();
    });

    it("should apply content styles", () => {
      render(
        <Card>
          <CardContent data-testid="content">Content</CardContent>
        </Card>
      );
      expect(screen.getByTestId("content")).toHaveClass("p-6");
    });
  });

  describe("CardFooter", () => {
    it("should render card footer", () => {
      render(
        <Card>
          <CardFooter data-testid="footer">Footer Content</CardFooter>
        </Card>
      );
      expect(screen.getByTestId("footer")).toBeInTheDocument();
    });

    it("should apply footer styles", () => {
      render(
        <Card>
          <CardFooter data-testid="footer">Footer</CardFooter>
        </Card>
      );
      expect(screen.getByTestId("footer")).toHaveClass("flex");
    });
  });

  describe("Complete Card", () => {
    it("should render complete card with all sections", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Complete Card</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>Main Content Area</CardContent>
          <CardFooter>Footer Content</CardFooter>
        </Card>
      );

      expect(screen.getByText("Complete Card")).toBeInTheDocument();
      expect(screen.getByText("Card Description")).toBeInTheDocument();
      expect(screen.getByText("Main Content Area")).toBeInTheDocument();
      expect(screen.getByText("Footer Content")).toBeInTheDocument();
    });
  });
});
