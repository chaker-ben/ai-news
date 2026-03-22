export type SourceType = "blog" | "twitter" | "youtube" | "tiktok" | "reddit" | "linkedin" | "arxiv";

export interface Article {
  id: string;
  sourceId: string;
  sourceType: SourceType;
  originalTitle: string;
  titleFr: string | null;
  originalContent: string | null;
  summaryFr: string | null;
  url: string;
  publishedAt: Date;
  collectedAt: Date;
  score: number;
  notified: boolean;
  contentHash: string;
}

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  active: boolean;
  lastCollected: Date | null;
}

export interface DigestConfig {
  digestTime: string;
  minScoreAlert: number;
  maxArticlesDigest: number;
  whatsappRecipient: string;
}

export interface ArticleDigest {
  titleFr: string;
  source: string;
  publishedAt: Date;
  summaryFr: string;
  url: string;
  score: number;
}
