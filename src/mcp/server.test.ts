import { describe, expect, it } from "vitest";
import { MCP_TOOL_NAMES } from "./tool-scope";

describe("Neobank MCP scope", () => {
  it("keeps card credentials out of the agent surface", async () => {
    expect(MCP_TOOL_NAMES).toEqual(["get_account_summary", "list_cards", "get_card", "get_payment", "create_payment", "list_reconciliation_breaks"]);
    expect(MCP_TOOL_NAMES.join(" ")).not.toMatch(/pan|cvv/i);
  });
});
