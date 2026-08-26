export function validateAchBankDetails(accountNumber: string, routingNumber: string) {
  if (!/^\d{4,17}$/.test(accountNumber)) throw new Error("Account number must contain 4 to 17 digits");
  if (!/^\d{9}$/.test(routingNumber)) throw new Error("Routing number must contain 9 digits");
}

export function maskAchAccountNumber(accountNumber: string) {
  return `••••${accountNumber.slice(-4)}`;
}
