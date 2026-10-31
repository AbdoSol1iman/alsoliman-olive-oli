"use server";

import { createOrder } from "@/lib/orders";

export async function submitOrder(payload: unknown) {
  const result = createOrder(payload);
  return result;
}
