import type { Payment } from "@/src/domain/payment-lifecycle";

export type PublicPayment = Omit<Payment, "recipientBank">;

export function toPublicPayment(payment: Payment): PublicPayment {
  const publicPayment = { ...payment };
  delete publicPayment.recipientBank;
  return publicPayment;
}
