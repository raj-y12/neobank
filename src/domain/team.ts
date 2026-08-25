export type EmployeeRole = "ADMIN" | "MEMBER";

export function validateSignupInput(input: { email?: string; password?: string; legalName?: string }) {
  const email = input.email?.trim().toLowerCase();
  const legalName = input.legalName?.trim();
  if (!email || !email.includes("@")) throw new Error("A valid email is required");
  if (!input.password || input.password.length < 8) throw new Error("Password must be at least 8 characters");
  if (!legalName || legalName.length < 2) throw new Error("Business name is required");
  return { email, password: input.password, legalName };
}

export function validateEmployeeInvite(input: { email?: string; role?: string }) {
  const email = input.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("A valid employee email is required");
  const role = input.role === "ADMIN" ? "ADMIN" : input.role === "MEMBER" ? "MEMBER" : null;
  if (!role) throw new Error("Employee role must be ADMIN or MEMBER");
  return { email, role };
}
