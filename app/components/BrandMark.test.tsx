import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandMark } from "./BrandMark";

describe("BrandMark", () => {
  it("stays decorative when the surrounding lockup supplies the brand name", () => {
    const markup = renderToStaticMarkup(<BrandMark />);

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('focusable="false"');
    expect(markup).not.toContain("<title");
  });
});
