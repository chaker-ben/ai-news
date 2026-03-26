"use client";

import { loadAirwallex } from "airwallex-payment-elements";

export const AIRWALLEX_ENV = (process.env.NEXT_PUBLIC_AIRWALLEX_ENV ||
  "demo") as "demo" | "prod";
export const AIRWALLEX_CLIENT_ID =
  process.env.NEXT_PUBLIC_AIRWALLEX_CLIENT_ID || "";

let initialized = false;

export async function initAirwallex(): Promise<void> {
  if (initialized) return;
  await loadAirwallex({ env: AIRWALLEX_ENV });
  initialized = true;
}
