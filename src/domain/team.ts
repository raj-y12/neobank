export type EmployeeRole = "ADMIN" | "MEMBER";

export function validateSignupInput(input: { email?: string; password?: string; legalName?: string }) {
  const email = input.email?.trim().toLowerCase();
  const legalName = input.legalName?.trim();
  if (!email || !email.includes("@")) throw new Error("A valid email is required");
  if (!input.password || input.password.length < 8) throw new Error("Password must be at least 8 characters");
  if (!legalName || legalName.length < 2) throw new Error("Business name is required");
  return { email, password: input.password, legalName };
}

export function validateEmployeeInvite(input: { firstName?: string; lastName?: string; email?: string; role?: string; password?: string }) {
  const firstName = input.firstName?.trim();
  const lastName = input.lastName?.trim();
  if (!firstName) throw new Error("Employee first name is required");
  if (!lastName) throw new Error("Employee last name is required");
  const email = input.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("A valid employee email is required");
  const role = input.role === "ADMIN" ? "ADMIN" : input.role === "MEMBER" ? "MEMBER" : null;
  if (!role) throw new Error("Employee role must be ADMIN or MEMBER");
  if (!input.password || input.password.length < 8) throw new Error("Password must be at least 8 characters");
  return { firstName, lastName, email, role, password: input.password };
}

export function formatEmployeeName(employee: { firstName?: string | null; lastName?: string | null; email?: string | null; id?: string }) {
  const name = [employee.firstName?.trim(), employee.lastName?.trim()].filter(Boolean).join(" ");
  return name || employee.email || employee.id || "Unassigned";
}
