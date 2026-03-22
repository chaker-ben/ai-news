import { z } from "zod";

const WORKERS_API_URL =
  process.env.WORKERS_API_URL || "http://localhost:8000";

// ── Schemas ──

export const articleSchema = z.object({
  id: z.string(),
  title: z.string(),
  original_title: z.string(),
  summary: z.string().nullable(),
  url: z.string(),
  source_type: z.string(),
  score: z.number(),
  published_at: z.string().nullable(),
  notified: z.boolean(),
});

export const articlesResponseSchema = z.object({
  articles: z.array(articleSchema),
  total: z.number(),
  skip: z.number(),
  limit: z.number(),
});

export const sourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  url: z.string(),
  active: z.boolean(),
  last_collected: z.string().nullable(),
});

export const sourcesResponseSchema = z.object({
  sources: z.array(sourceSchema),
});

export const statsSchema = z.object({
  total_articles: z.number(),
  notified_articles: z.number(),
  active_sources: z.number(),
  total_notifications: z.number(),
  successful_notifications: z.number(),
});

// ── Types ──

export type Article = z.infer<typeof articleSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Stats = z.infer<typeof statsSchema>;

// ── API Client ──

async function fetchApi<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${WORKERS_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return schema.parse(data);
}

export async function getArticles(params?: {
  skip?: number;
  limit?: number;
  min_score?: number;
  source_type?: string;
}): Promise<z.infer<typeof articlesResponseSchema>> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.set("skip", String(params.skip));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.min_score) searchParams.set("min_score", String(params.min_score));
  if (params?.source_type) searchParams.set("source_type", params.source_type);

  const query = searchParams.toString();
  return fetchApi(`/articles${query ? `?${query}` : ""}`, articlesResponseSchema);
}

export async function getSources(): Promise<z.infer<typeof sourcesResponseSchema>> {
  return fetchApi("/sources", sourcesResponseSchema);
}

export async function getStats(): Promise<Stats> {
  return fetchApi("/stats", statsSchema);
}

export async function triggerCollection(): Promise<{ status: string }> {
  return fetchApi("/collect/now", z.object({ status: z.string() }), {
    method: "POST",
    next: { revalidate: 0 },
  });
}

export async function triggerDigest(): Promise<{ status: string }> {
  return fetchApi("/notify/digest", z.object({ status: z.string() }), {
    method: "POST",
    next: { revalidate: 0 },
  });
}
