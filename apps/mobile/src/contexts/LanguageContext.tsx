import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import {
  type LanguageCode,
  languages,
  getStoredLanguage,
  setStoredLanguage,
} from "@/lib/i18n";

interface LanguageContextType {
  language: LanguageCode;
  isRTL: boolean;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  languages: typeof languages;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [language, setLang] = useState<LanguageCode>(
    (i18n.language as LanguageCode) || "fr",
  );
  const isRTL = language === "ar";

  useEffect(() => {
    getStoredLanguage().then((stored) => {
      if (stored !== language) {
        setLang(stored);
        i18n.changeLanguage(stored);
      }
    });
  }, []);

  const setLanguage = useCallback(
    async (lang: LanguageCode) => {
      setLang(lang);
      await i18n.changeLanguage(lang);
      await setStoredLanguage(lang);

      const needsRTL = lang === "ar";
      if (I18nManager.isRTL !== needsRTL) {
        I18nManager.allowRTL(needsRTL);
        I18nManager.forceRTL(needsRTL);
        // Reload required for RTL layout change to take effect
        // expo-updates may not be installed in dev — graceful fallback
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const Updates = require("expo-updates") as { reloadAsync: () => Promise<void> };
          await Updates.reloadAsync();
        } catch {
          // Dev mode or expo-updates not available — manual restart needed
        }
      }
    },
    [i18n],
  );

  return (
    <LanguageContext.Provider value={{ language, isRTL, setLanguage, languages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}
