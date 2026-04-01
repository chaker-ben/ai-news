import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
  CLERK_WEBHOOK_SECRET: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1),
  SENTRY_DSN: z.string().url().optional(),
  AIRWALLEX_API_KEY: z.string().min(1).optional(),
  AIRWALLEX_CLIENT_ID: z.string().min(1).optional(),
  AIRWALLEX_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_AIRWALLEX_ENV: z.enum(["demo", "prod"]).default("demo"),
  NEXT_PUBLIC_AIRWALLEX_CLIENT_ID: z.string().optional(),
  AIRWALLEX_BASE_URL: z.string().url().default("https://api-demo.airwallex.com"),
  // R2/S3 Storage
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET_NAME: z.string().min(1).default("ai-news-media"),
  R2_PUBLIC_URL: z.string().url().optional(),
});

function getEnv() {
  return envSchema.parse(process.env);
}

/** Validated environment variables — parsed lazily at first access (safe for `next build`). */
export const env = new Proxy({} as z.infer<typeof envSchema>, {
  get(_target, prop: string) {
    const parsed = getEnv();
    return parsed[prop as keyof typeof parsed];
  },
});
