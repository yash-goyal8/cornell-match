/**
 * Utils Library Tests
 * 
 * Tests for utility functions including cn (class name merger).
 */

import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (className merger)", () => {
  it("should merge simple class names", () => {
    const result = cn("class1", "class2");
    expect(result).toContain("class1");
    expect(result).toContain("class2");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toContain("base");
    expect(result).toContain("active");
  });

  it("should filter out falsy values", () => {
    const result = cn("base", false, null, undefined, "valid");
    expect(result).toBe("base valid");
  });

  it("should handle object syntax", () => {
    const result = cn({
      base: true,
      active: true,
      disabled: false,
    });
    expect(result).toContain("base");
    expect(result).toContain("active");
    expect(result).not.toContain("disabled");
  });

  it("should merge Tailwind classes correctly", () => {
    // Later classes should override earlier conflicting classes
    const result = cn("p-4", "p-2");
    expect(result).toBe("p-2");
  });

  it("should handle empty inputs", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("should handle arrays of classes", () => {
    const result = cn(["class1", "class2"], "class3");
    expect(result).toContain("class1");
    expect(result).toContain("class2");
    expect(result).toContain("class3");
  });

  it("should handle complex Tailwind merging", () => {
    const result = cn(
      "bg-red-500 hover:bg-red-600",
      "bg-blue-500"
    );
    expect(result).toContain("bg-blue-500");
    expect(result).not.toContain("bg-red-500");
  });
});
