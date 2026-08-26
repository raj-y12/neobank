import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { AddMoneyForm } from "./AddMoneyForm";

describe("AddMoneyForm", () => {
  it("keeps the idle form quiet until the user starts an action", () => {
    const markup = renderToStaticMarkup(<AddMoneyForm enabled />);

    expect(markup).not.toContain("Ready to add money");
    expect(markup).not.toContain('role="status"');
  });
});
