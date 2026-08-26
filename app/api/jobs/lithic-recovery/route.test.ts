import { afterEach, describe, expect, it } from "vitest";
import { hasCronAuthorization } from "../../../../src/services/cron-auth";

describe("Lithic recovery job", () => {
  const previous = process.env.CRON_SECRET;
  afterEach(() => { process.env.CRON_SECRET = previous; });
  it("rejects requests without the configured cron bearer secret", () => {
    process.env.CRON_SECRET = "job-secret";
    expect(hasCronAuthorization(new Request("http://localhost/api/jobs/lithic-recovery"), process.env.CRON_SECRET)).toBe(false);
  });
});
