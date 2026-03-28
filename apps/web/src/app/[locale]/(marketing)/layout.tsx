import type { Metadata } from "next";

const meta: Record<string, { title: string; description: string }> = {
  fr: {
    title: "AI News — Votre veille IA automatisée",
    description:
      "Recevez chaque jour un digest personnalisé des actualités IA depuis plus de 100 sources, résumé et traduit, livré par WhatsApp, email et Telegram.",
  },
  en: {
    title: "AI News — Automated AI Intelligence",
    description:
      "Get a personalized daily digest of AI news from 100+ sources, summarized and translated, delivered via WhatsApp, email and Telegram.",
  },
  ar: {
    title: "AI News — رصد الذكاء الاصطناعي تلقائيًا",
    description:
      "احصل على ملخص يومي مخصص لأخبار الذكاء الاصطناعي من أكثر من 100 مصدر، يُلخَّص ويُترجَم ويُرسَل عبر واتساب والبريد الإلكتروني وتيليغرام.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { title, description } = meta[locale] ?? meta.en;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ainews.app";
  const canonical = `${baseUrl}/${locale}/landing`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "AI News",
      images: [{ url: `${baseUrl}/og-landing.png`, width: 1200, height: 630 }],
      locale: ({ ar: "ar_SA", fr: "fr_FR", en: "en_US" } as Record<string, string>)[locale] ?? "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${baseUrl}/og-landing.png`],
    },
  };
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark" data-theme="dark">
      {children}
    </div>
  );
}
