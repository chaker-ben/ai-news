import { z } from "zod";

const AIRWALLEX_BASE_URL =
  process.env.AIRWALLEX_BASE_URL || "https://api-demo.airwallex.com";
const AIRWALLEX_API_KEY = process.env.AIRWALLEX_API_KEY || "";
const AIRWALLEX_CLIENT_ID = process.env.AIRWALLEX_CLIENT_ID || "";

let cachedToken: { token: string; expiresAt: number } | null = null;

const authResponseSchema = z.object({
  token: z.string(),
});

async function getAuthToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const response = await fetch(
    `${AIRWALLEX_BASE_URL}/api/v1/authentication/login`,
    {
      method: "POST",
      headers: {
        "x-client-id": AIRWALLEX_CLIENT_ID,
        "x-api-key": AIRWALLEX_API_KEY,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Airwallex auth failed: ${response.status}`);
  }

  const data: unknown = await response.json();
  const parsed = authResponseSchema.parse(data);

  // Cache for 10 minutes (Airwallex tokens last ~15min)
  cachedToken = { token: parsed.token, expiresAt: Date.now() + 10 * 60 * 1000 };
  return parsed.token;
}

export async function airwallexRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<T> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  if (idempotencyKey) {
    headers["x-idempotency-key"] = idempotencyKey;
  }

  const response = await fetch(`${AIRWALLEX_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Airwallex API error ${response.status}: ${errorBody}`);
  }

  return response.json() as Promise<T>;
}
