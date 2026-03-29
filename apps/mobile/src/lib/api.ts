import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const hostIp = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";
const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${hostIp}:8000`;
const WEB_API_URL = process.env.EXPO_PUBLIC_WEB_URL || `http://${hostIp}:3000`;

async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync("clerk_token");
}

interface FetchOptions extends RequestInit {
  auth?: boolean;
  useWebApi?: boolean;
}

export async function api<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { auth = true, useWebApi = false, ...fetchOptions } = options;
  const baseUrl = useWebApi ? WEB_API_URL : API_URL;

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

  const response = await fetch(`${baseUrl}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  // Articles
  getArticles: (params?: {
    skip?: number;
    limit?: number;
    min_score?: number;
    source_type?: string;
    search?: string;
  }) => {
    const search = new URLSearchParams();
    if (params?.skip) search.set("skip", String(params.skip));
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.min_score) search.set("min_score", String(params.min_score));
    if (params?.source_type) search.set("source_type", params.source_type);
    if (params?.search) search.set("search", params.search);
    const query = search.toString();
    return api<{ articles: Article[]; total: number }>(
      `/articles${query ? `?${query}` : ""}`,
      { auth: false },
    );
  },

  getArticle: (id: string) =>
    api<ArticleDetail>(`/articles/${id}`, { auth: false }),

  // Bookmarks
  getBookmarks: () =>
    api<{ data: Bookmark[] }>("/api/user/bookmarks", { useWebApi: true }),
  addBookmark: (articleId: string) =>
    api<{ data: Bookmark }>("/api/user/bookmarks", {
      method: "POST",
      body: JSON.stringify({ articleId }),
      useWebApi: true,
    }),
  removeBookmark: (articleId: string) =>
    api<{ success: boolean }>(`/api/user/bookmarks/${articleId}`, {
      method: "DELETE",
      useWebApi: true,
    }),

  // Preferences
  getPreferences: () =>
    api<{ data: UserPreferences }>("/api/user/preferences", { useWebApi: true }),
  updatePreferences: (data: Record<string, unknown>) =>
    api<{ data: UserPreferences }>("/api/user/preferences", {
      method: "POST",
      body: JSON.stringify(data),
      useWebApi: true,
    }),

  // Categories
  getCategories: () =>
    api<{ data: Category[] }>("/api/categories", { auth: false, useWebApi: true }),

  // Subscription
  getSubscription: () =>
    api<{ data: Subscription }>("/api/user/subscription", { useWebApi: true }),

  // Analytics
  getAnalytics: () =>
    api<AnalyticsData>("/api/analytics", { useWebApi: true }),

  // Dashboard stats
  getStats: () =>
    api<DashboardStats>("/api/analytics", { useWebApi: true }),

  // Sources
  getSources: () =>
    api<{ data: Source[] }>("/api/sources", { auth: false, useWebApi: true }),

  // Alerts
  getAlerts: () =>
    api<{ data: CustomAlert[] }>("/api/user/alerts", { useWebApi: true }),
  createAlert: (data: CreateAlertInput) =>
    api<{ data: CustomAlert }>("/api/user/alerts", {
      method: "POST",
      body: JSON.stringify(data),
      useWebApi: true,
    }),
  updateAlert: (id: string, data: Partial<CreateAlertInput & { isActive: boolean }>) =>
    api<{ data: CustomAlert }>(`/api/user/alerts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      useWebApi: true,
    }),
  deleteAlert: (id: string) =>
    api<{ success: boolean }>(`/api/user/alerts/${id}`, {
      method: "DELETE",
      useWebApi: true,
    }),

  // Organizations
  getOrganizations: () =>
    api<{ data: Organization[] }>("/api/organizations", { useWebApi: true }),
  createOrganization: (data: { name: string; slug: string }) =>
    api<{ data: Organization }>("/api/organizations", {
      method: "POST",
      body: JSON.stringify(data),
      useWebApi: true,
    }),
  inviteMember: (orgId: string, data: { email: string; role: string }) =>
    api<{ data: OrganizationMember }>(`/api/organizations/${orgId}/members`, {
      method: "POST",
      body: JSON.stringify(data),
      useWebApi: true,
    }),
  removeMember: (orgId: string, memberId: string) =>
    api<{ success: boolean }>(`/api/organizations/${orgId}/members`, {
      method: "DELETE",
      body: JSON.stringify({ memberId }),
      useWebApi: true,
    }),

  // Billing
  getPlans: () =>
    api<{ data: BillingPlan[] }>("/api/billing/plans", { useWebApi: true }),

  // Chat
  getChatUsage: () =>
    api<{ data: ChatUsage }>("/api/chat/usage", { useWebApi: true }),
  createConversation: (articleId: string) =>
    api<{ data: ChatConversation }>("/api/chat/conversations", {
      method: "POST",
      body: JSON.stringify({ articleId }),
      useWebApi: true,
    }),
  getConversations: (params?: { skip?: number; take?: number }) => {
    const search = new URLSearchParams();
    if (params?.skip) search.set("skip", String(params.skip));
    if (params?.take) search.set("take", String(params.take));
    const query = search.toString();
    return api<{ data: ChatConversation[]; total: number }>(
      `/api/chat/conversations${query ? `?${query}` : ""}`,
      { useWebApi: true },
    );
  },
  getMessages: (
    conversationId: string,
    params?: { skip?: number; take?: number },
  ) => {
    const search = new URLSearchParams();
    if (params?.skip) search.set("skip", String(params.skip));
    if (params?.take) search.set("take", String(params.take));
    const query = search.toString();
    return api<{ data: ChatMessage[]; total: number }>(
      `/api/chat/conversations/${conversationId}/messages${query ? `?${query}` : ""}`,
      { useWebApi: true },
    );
  },
  sendMessage: async (
    conversationId: string,
    content: string,
  ): Promise<ReadableStreamDefaultReader<Uint8Array> | null> => {
    const token = await SecureStore.getItemAsync("clerk_token");
    const baseUrl =
      process.env.EXPO_PUBLIC_WEB_URL || `http://localhost:3000`;
    const response = await fetch(
      `${baseUrl}/api/chat/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content }),
      },
    );
    return response.body?.getReader() ?? null;
  },

  // Publish
  createArticle: (data: {
    title: string;
    content?: string;
    originalUrl?: string;
    language?: string;
  }) =>
    api<{ data: PublishedArticle }>("/api/articles/publish", {
      method: "POST",
      body: JSON.stringify(data),
      useWebApi: true,
    }),
  updateArticle: (
    articleId: string,
    data: { title?: string; content?: string; originalUrl?: string },
  ) =>
    api<{ data: PublishedArticle }>(`/api/articles/publish/${articleId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      useWebApi: true,
    }),
  deleteArticle: (articleId: string) =>
    api<{ data: { deleted: boolean } }>(`/api/articles/publish/${articleId}`, {
      method: "DELETE",
      useWebApi: true,
    }),
  submitArticle: (articleId: string) =>
    api<{ data: PublishedArticle }>(
      `/api/articles/publish/${articleId}/submit`,
      {
        method: "POST",
        useWebApi: true,
      },
    ),
  getMyArticles: (params?: {
    skip?: number;
    take?: number;
    status?: string;
  }) => {
    const search = new URLSearchParams();
    if (params?.skip) search.set("skip", String(params.skip));
    if (params?.take) search.set("take", String(params.take));
    if (params?.status) search.set("status", params.status);
    const query = search.toString();
    return api<{
      data: PublishedArticle[];
      pagination: { total: number; hasMore: boolean };
    }>(`/api/articles/my${query ? `?${query}` : ""}`, { useWebApi: true });
  },
  getPresignedUrl: (data: {
    articleId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    category: string;
  }) =>
    api<{ data: { uploadUrl: string; key: string; publicUrl: string } }>(
      "/api/upload/presign",
      {
        method: "POST",
        body: JSON.stringify(data),
        useWebApi: true,
      },
    ),
  confirmUpload: (data: {
    articleId: string;
    key: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    type: string;
  }) =>
    api<{ data: ArticleMedia }>("/api/upload/confirm", {
      method: "POST",
      body: JSON.stringify(data),
      useWebApi: true,
    }),
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

export interface ArticleDetail extends Article {
  title_fr: string | null;
  summary_fr: string | null;
  original_content: string | null;
  collected_at: string | null;
  content_hash: string;
  word_count?: number;
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
  fullscreenArticles?: boolean;
  autoAudioReader?: boolean;
  selectedCategoryIds?: string[];
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
  topSources: Array<{ source: string; count: number; avgScore?: number }>;
  dailyActivity?: Array<{ date: string; count: number; avgScore?: number }>;
  scoreBuckets?: Array<{ label: string; count: number }>;
}

export interface DashboardStats {
  totalArticles: number;
  averageScore: number;
  articlesToday: number;
  sourceDistribution: Record<string, number>;
  topSources: Array<{ source: string; count: number }>;
}

export interface Source {
  id: string;
  name: string;
  type: string;
  url: string;
  active: boolean;
  lastCollected: string | null;
}

export interface CustomAlert {
  id: string;
  name: string;
  keywords: string[];
  channels: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertInput {
  name: string;
  keywords: string[];
  channels: string[];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  ownerId: string;
  plan: string;
  role: string;
  memberCount: number;
  members: OrganizationMember[];
}

export interface OrganizationMember {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  role: string;
}

export interface BillingPlan {
  id: string;
  slug: string;
  name: string;
  price: number;
  yearlyPrice: number | null;
  currency: string;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  trialDays: number | null;
}

export interface ChatUsage {
  messages_today: number;
  messages_limit: number;
  tokens_this_month: number;
  tokens_limit: number;
  can_chat: boolean;
}

export interface ChatConversation {
  id: string;
  articleId: string;
  title: string | null;
  tokenCount: number;
  messageCount: number;
  createdAt: string;
  article: {
    id: string;
    originalTitle: string;
    titleFr: string | null;
    titleEn: string | null;
    thumbnailUrl: string | null;
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tokensUsed: number;
  createdAt: string;
}

export interface PublishedArticle {
  id: string;
  originalTitle: string;
  originalContent: string | null;
  originalUrl: string | null;
  status: "draft" | "pending_review" | "published" | "rejected";
  isUserGenerated: boolean;
  createdAt: string;
  media: ArticleMedia[];
}

export interface ArticleMedia {
  id: string;
  type: "image" | "video";
  url: string;
  key: string;
  size: number;
  mimeType: string;
  order: number;
}
