"use client";

import { useState, useEffect, useCallback } from "react";

interface Category {
  id: string;
  name: string;
  nameFr: string;
  nameAr: string | null;
  slug: string;
  icon: string | null;
}

interface UserPreferences {
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
  categories: Array<{ category: Category }>;
  sources: Array<{ source: { id: string; name: string; type: string } }>;
}

interface UsePreferencesReturn {
  preferences: UserPreferences | null;
  allCategories: Category[];
  isLoading: boolean;
  error: string | null;
  updatePreferences: (data: Record<string, unknown>) => Promise<void>;
}

export function usePreferences(): UsePreferencesReturn {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [prefsRes, catsRes] = await Promise.all([
          fetch("/api/user/preferences"),
          fetch("/api/categories"),
        ]);

        if (prefsRes.ok) {
          const prefsData: { data: UserPreferences } = await prefsRes.json();
          setPreferences(prefsData.data);
        }

        if (catsRes.ok) {
          const catsData: { data: Category[] } = await catsRes.json();
          setAllCategories(catsData.data);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load preferences"
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const updatePreferences = useCallback(
    async (data: Record<string, unknown>) => {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Failed to update preferences");
      }

      const updated: { data: UserPreferences } = await res.json();
      setPreferences(updated.data);
    },
    []
  );

  return { preferences, allCategories, isLoading, error, updatePreferences };
}
