import * as SecureStore from "expo-secure-store";

import Constants from "expo-constants";

// Use device's LAN IP — localhost doesn't work from a physical device
// Point to the Workers API (port 8000) for public article data
const hostIp = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";
const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${hostIp}:8000`;

async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync("clerk_token");
}

interface FetchOptions extends RequestInit {
  auth?: boolean;
}

export async function api<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { auth = true, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  if (auth) {
    const token = await getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// Typed API methods
export const apiClient = {
  // Articles
  getArticles: (params?: {
    skip?: number;
    limit?: number;
    min_score?: number;
  }) => {
    const search = new URLSearchParams();
    if (params?.skip) search.set("skip", String(params.skip));
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.min_score) search.set("min_score", String(params.min_score));
    const query = search.toString();
    return api<{ articles: Article[]; total: number }>(
      `/articles${query ? `?${query}` : ""}`,
      { auth: false },
    );
  },

  // Bookmarks
  getBookmarks: () => api<{ data: Bookmark[] }>("/api/user/bookmarks"),
  addBookmark: (articleId: string) =>
    api<{ data: Bookmark }>("/api/user/bookmarks", {
      method: "POST",
      body: JSON.stringify({ articleId }),
    }),
  removeBookmark: (articleId: string) =>
    api<{ success: boolean }>(`/api/user/bookmarks/${articleId}`, {
      method: "DELETE",
    }),

  // Preferences
  getPreferences: () =>
    api<{ data: UserPreferences }>("/api/user/preferences"),
  updatePreferences: (data: Record<string, unknown>) =>
    api<{ data: UserPreferences }>("/api/user/preferences", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Categories
  getCategories: () =>
    api<{ data: Category[] }>("/api/categories", { auth: false }),

  // Subscription
  getSubscription: () =>
    api<{ data: Subscription }>("/api/user/subscription"),

  // Analytics
  getAnalytics: () =>
    api<AnalyticsData>("/api/analytics", { auth: true }),
};

// Types
export interface Article {
  id: string;
  title: string;
  original_title: string;
  summary: string | null;
  title_en: string | null;
  title_ar: string | null;
  summary_en: string | null;
  summary_ar: string | null;
  url: string;
  source_type: string;
  score: number;
  published_at: string | null;
  notified: boolean;
}

export interface Bookmark {
  id: string;
  articleId: string;
  article: Article;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  nameFr: string;
  nameAr: string | null;
  slug: string;
  icon: string | null;
}

export interface UserPreferences {
  id: string;
  whatsappNumber: string | null;
  telegramChatId: string | null;
  emailNotifications: boolean;
  digestTime: string;
  timezone: string;
  digestEnabled: boolean;
  weeklyDigestEnabled: boolean;
  minScoreAlert: number;
  maxArticlesDigest: number;
  language: string;
}

export interface Subscription {
  id: string;
  plan: string;
  status: string;
  billingCycle: string;
  amount: number;
  currency: string;
}

export interface AnalyticsData {
  totalArticles: number;
  averageScore: number;
  sourceDistribution: Record<string, number>;
  articlesToday: number;
  topSources: Array<{ source: string; count: number }>;
}
