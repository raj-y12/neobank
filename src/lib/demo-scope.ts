export function demoScope() {
  return {
    businessId: process.env.LEDGER_BUSINESS_ID ?? "demo-business",
    accountId: process.env.LEDGER_ACCOUNT_ID ?? "demo-account",
  };
}
