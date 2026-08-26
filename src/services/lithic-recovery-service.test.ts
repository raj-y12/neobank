import { describe, expect, it } from "vitest";
import { recoverAgedLithicEvents } from "./lithic-recovery-service";

describe("recoverAgedLithicEvents", () => {
  it("replays each distinct aged parked transaction once", async () => {
    const replayed: string[] = [];
    const count = await recoverAgedLithicEvents({
      listAged: async () => [{ providerTransactionId: "tx_1" }, { providerTransactionId: "tx_1" }, { providerTransactionId: "tx_2" }],
      replay: async (transactionId) => { replayed.push(transactionId); },
    });
    expect(replayed).toEqual(["tx_1", "tx_2"]);
    expect(count).toBe(2);
  });
});
