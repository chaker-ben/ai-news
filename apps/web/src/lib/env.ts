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
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  SENTRY_DSN: z.string().url().optional(),
  AIRWALLEX_API_KEY: z.string().min(1).optional(),
  AIRWALLEX_CLIENT_ID: z.string().min(1).optional(),
  AIRWALLEX_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_AIRWALLEX_ENV: z.enum(["demo", "prod"]).default("demo"),
  NEXT_PUBLIC_AIRWALLEX_CLIENT_ID: z.string().optional(),
  AIRWALLEX_BASE_URL: z.string().url().default("https://api-demo.airwallex.com"),
});

export const env = envSchema.parse(process.env);
