import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("app icon", () => {
  it("uses the Corgi brand mark as the browser icon", () => {
    const iconPath = join(process.cwd(), "app", "icon.svg");

    expect(existsSync(iconPath)).toBe(true);
    if (!existsSync(iconPath)) return;

    const icon = readFileSync(iconPath, "utf8");

    expect(icon).toContain('viewBox="0 0 40 40"');
    expect(icon).toContain("M5.5 14.5 8.2 4.2l9.1 6.1");
    expect(icon).toContain('fill="#ff5c00"');
  });
});
