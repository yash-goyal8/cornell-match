/**
 * Storage Library Tests
 * 
 * Tests for localStorage utilities including:
 * - Get/set operations with type safety
 * - Expiration handling
 * - Version invalidation
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  clearAppStorage,
  createStorageState,
  STORAGE_KEYS,
} from "@/lib/storage";

describe("Storage Utilities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("setStorageItem", () => {
    it("should store item with correct prefix", () => {
      setStorageItem(STORAGE_KEYS.ACTIVE_TAB, "individuals");
      const key = "stm_active_tab";
      const stored = localStorage.getItem(key);
      expect(stored).not.toBeNull();
    });

    it("should store item with version information", () => {
      setStorageItem(STORAGE_KEYS.ACTIVE_TAB, "individuals");
      const stored = JSON.parse(localStorage.getItem("stm_active_tab") || "{}");
      expect(stored.version).toBe("1");
    });

    it("should store item with timestamp", () => {
      const before = Date.now();
      setStorageItem(STORAGE_KEYS.ACTIVE_TAB, "individuals");
      const after = Date.now();
      const stored = JSON.parse(localStorage.getItem("stm_active_tab") || "{}");
      expect(stored.timestamp).toBeGreaterThanOrEqual(before);
      expect(stored.timestamp).toBeLessThanOrEqual(after);
    });

    it("should store item with expiration when provided", () => {
      const expiresInMs = 60000;
      setStorageItem(STORAGE_KEYS.ACTIVE_TAB, "individuals", expiresInMs);
      const stored = JSON.parse(localStorage.getItem("stm_active_tab") || "{}");
      expect(stored.expiresAt).toBeDefined();
      expect(stored.expiresAt).toBeGreaterThan(Date.now());
    });

    it("should return true on success", () => {
      const result = setStorageItem(STORAGE_KEYS.ACTIVE_TAB, "individuals");
      expect(result).toBe(true);
    });

    it("should handle complex objects", () => {
      const filters = { programs: ["MBA", "CM"], skills: ["React"] };
      setStorageItem(STORAGE_KEYS.PEOPLE_FILTERS, filters);
      const retrieved = getStorageItem(STORAGE_KEYS.PEOPLE_FILTERS, {});
      expect(retrieved).toEqual(filters);
    });
  });

  describe("getStorageItem", () => {
    it("should return default value when item does not exist", () => {
      const result = getStorageItem(STORAGE_KEYS.ACTIVE_TAB, "default");
      expect(result).toBe("default");
    });

    it("should return stored value when item exists", () => {
      setStorageItem(STORAGE_KEYS.ACTIVE_TAB, "teams");
      const result = getStorageItem(STORAGE_KEYS.ACTIVE_TAB, "default");
      expect(result).toBe("teams");
    });

    it("should return default for expired items", () => {
      // Manually create an expired item
      const expiredItem = {
        value: "expired-value",
        timestamp: Date.now() - 120000,
        version: "1",
        expiresAt: Date.now() - 60000,
      };
      localStorage.setItem("stm_active_tab", JSON.stringify(expiredItem));
      
      const result = getStorageItem(STORAGE_KEYS.ACTIVE_TAB, "default");
      expect(result).toBe("default");
    });

    it("should return default for version mismatch", () => {
      // Manually create an old version item
      const oldVersionItem = {
        value: "old-value",
        timestamp: Date.now(),
        version: "0", // Old version
      };
      localStorage.setItem("stm_active_tab", JSON.stringify(oldVersionItem));
      
      const result = getStorageItem(STORAGE_KEYS.ACTIVE_TAB, "default");
      expect(result).toBe("default");
    });

    it("should handle corrupted JSON gracefully", () => {
      localStorage.setItem("stm_active_tab", "not-valid-json");
      const result = getStorageItem(STORAGE_KEYS.ACTIVE_TAB, "default");
      expect(result).toBe("default");
    });
  });

  describe("removeStorageItem", () => {
    it("should remove item from storage", () => {
      setStorageItem(STORAGE_KEYS.ACTIVE_TAB, "teams");
      removeStorageItem(STORAGE_KEYS.ACTIVE_TAB);
      const result = getStorageItem(STORAGE_KEYS.ACTIVE_TAB, "default");
      expect(result).toBe("default");
    });

    it("should return true on success", () => {
      setStorageItem(STORAGE_KEYS.ACTIVE_TAB, "teams");
      const result = removeStorageItem(STORAGE_KEYS.ACTIVE_TAB);
      expect(result).toBe(true);
    });

    it("should not throw for non-existent items", () => {
      expect(() => removeStorageItem(STORAGE_KEYS.ACTIVE_TAB)).not.toThrow();
    });
  });

  describe("clearAppStorage", () => {
    it("should clear all app-prefixed items", () => {
      setStorageItem(STORAGE_KEYS.ACTIVE_TAB, "teams");
      setStorageItem(STORAGE_KEYS.THEME, "dark");
      setStorageItem(STORAGE_KEYS.PEOPLE_FILTERS, { skills: ["React"] });
      
      clearAppStorage();
      
      expect(getStorageItem(STORAGE_KEYS.ACTIVE_TAB, null)).toBeNull();
      expect(getStorageItem(STORAGE_KEYS.THEME, null)).toBeNull();
      expect(getStorageItem(STORAGE_KEYS.PEOPLE_FILTERS, null)).toBeNull();
    });

    it("should not affect non-prefixed items", () => {
      localStorage.setItem("other_key", "other_value");
      setStorageItem(STORAGE_KEYS.ACTIVE_TAB, "teams");
      
      clearAppStorage();
      
      expect(localStorage.getItem("other_key")).toBe("other_value");
    });

    it("should return true on success", () => {
      setStorageItem(STORAGE_KEYS.ACTIVE_TAB, "teams");
      const result = clearAppStorage();
      expect(result).toBe(true);
    });
  });

  describe("createStorageState", () => {
    it("should return getter and setter functions", () => {
      const [getValue, setValue] = createStorageState(
        STORAGE_KEYS.ACTIVE_TAB,
        "default"
      );
      expect(typeof getValue).toBe("function");
      expect(typeof setValue).toBe("function");
    });

    it("should getter return default when empty", () => {
      const [getValue] = createStorageState(STORAGE_KEYS.ACTIVE_TAB, "default");
      expect(getValue()).toBe("default");
    });

    it("should setter update storage", () => {
      const [getValue, setValue] = createStorageState(
        STORAGE_KEYS.ACTIVE_TAB,
        "default"
      );
      setValue("teams");
      expect(getValue()).toBe("teams");
    });
  });
});
