import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nManager } from "react-native";

import fr from "../../locales/fr.json";
import en from "../../locales/en.json";
import ar from "../../locales/ar.json";

const LANGUAGE_KEY = "user_language";

export const languages = {
  fr: { label: "Français", nativeLabel: "Français", dir: "ltr" },
  en: { label: "English", nativeLabel: "English", dir: "ltr" },
  ar: { label: "العربية", nativeLabel: "العربية", dir: "rtl" },
} as const;

export type LanguageCode = keyof typeof languages;

export async function getStoredLanguage(): Promise<LanguageCode> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (stored && stored in languages) {
      return stored as LanguageCode;
    }
  } catch {
    // fallback
  }
  return "fr";
}

export async function setStoredLanguage(lang: LanguageCode): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
}

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: I18nManager.isRTL ? "ar" : "fr",
  fallbackLng: "fr",
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: "v4",
});

export default i18n;
