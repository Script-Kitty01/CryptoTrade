import { describe, expect, it } from "vitest";
import {
  buildPageNumbers,
  cn,
  convertOHLCData,
  ELLIPSIS,
  formatCurrency,
  formatPercentage,
  timeAgo,
  trendingClasses,
} from "@/lib/utils";

describe("cn", () => {
  it("merges class names and resolves tailwind conflicts", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", true && "visible")).toBe(
      "base visible",
    );
  });
});

describe("formatCurrency", () => {
  it("formats numbers as USD currency by default", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("hides symbol when requested", () => {
    expect(formatCurrency(1234.56, 2, "usd", false)).toBe("1,234.56");
  });

  it("returns fallback for invalid values", () => {
    expect(formatCurrency(null)).toBe("$0.00");
    expect(formatCurrency(undefined)).toBe("$0.00");
    expect(formatCurrency(NaN)).toBe("$0.00");
  });

  it("respects custom digit count", () => {
    expect(formatCurrency(1234.5678, 4)).toBe("$1,234.5678");
  });
});

describe("formatPercentage", () => {
  it("formats numbers as percentage", () => {
    expect(formatPercentage(12.345)).toBe("12.3%");
    expect(formatPercentage(-5.5)).toBe("-5.5%");
  });

  it("returns fallback for invalid values", () => {
    expect(formatPercentage(null)).toBe("0.0%");
    expect(formatPercentage(undefined)).toBe("0.0%");
  });
});

describe("trendingClasses", () => {
  it("returns up classes for positive values", () => {
    expect(trendingClasses(5)).toEqual({
      textClass: "text-pink-400",
      bgClass: "bg-pink-500/10",
      iconClass: "icon-up",
    });
  });

  it("returns down classes for negative values", () => {
    expect(trendingClasses(-5)).toEqual({
      textClass: "text-red-400",
      bgClass: "bg-red-500/10",
      iconClass: "icon-down",
    });
  });
});

describe("timeAgo", () => {
  it("returns just now for recent timestamps", () => {
    expect(timeAgo(Date.now() - 30_000)).toBe("just now");
  });

  it("returns minutes for recent timestamps", () => {
    expect(timeAgo(Date.now() - 120_000)).toBe("2 min");
  });

  it("returns hours for older timestamps", () => {
    expect(timeAgo(Date.now() - 3_600_000)).toBe("1 hour");
  });

  it("returns ISO date for very old timestamps", () => {
    const date = new Date("2020-01-01");
    expect(timeAgo(date)).toBe("2020-01-01");
  });
});

describe("convertOHLCData", () => {
  it("converts OHLC arrays to chart data and filters duplicates", () => {
    const data: OHLCData[] = [
      [1_000_000, 100, 110, 90, 105],
      [1_000_000, 101, 111, 91, 106],
      [2_000_000, 102, 112, 92, 107],
    ];

    expect(convertOHLCData(data)).toEqual([
      { time: 1_000_000, open: 100, high: 110, low: 90, close: 105 },
      { time: 2_000_000, open: 102, high: 112, low: 92, close: 107 },
    ]);
  });
});

describe("buildPageNumbers", () => {
  it("returns all pages when total is small", () => {
    expect(buildPageNumbers(1, 3)).toEqual([1, 2, 3]);
  });

  it("adds ellipsis for large page ranges", () => {
    expect(buildPageNumbers(5, 20)).toEqual([
      1,
      ELLIPSIS,
      4,
      5,
      6,
      ELLIPSIS,
      20,
    ]);
  });

  it("handles current page near start", () => {
    expect(buildPageNumbers(2, 20)).toEqual([1, 2, 3, ELLIPSIS, 20]);
  });

  it("handles current page near end", () => {
    expect(buildPageNumbers(19, 20)).toEqual([1, ELLIPSIS, 18, 19, 20]);
  });
});
