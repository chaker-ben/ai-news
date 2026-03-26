import { createHmac } from "crypto";

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const computed = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return computed === signature;
}
