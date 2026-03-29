import { prisma } from "../index";
import type { PlanSlug } from "@prisma/client";

// ─────────────────────────────────────────────
// Categories (AI domains)
// ─────────────────────────────────────────────

const categories = [
  {
    name: "Large Language Models",
    nameFr: "Grands Modèles de Langage",
    nameAr: "نماذج اللغة الكبيرة",
    slug: "llm",
    description: "GPT, Claude, Gemini, Llama, and other LLMs",
    icon: "MessageSquare",
    keywords: [
      "LLM",
      "GPT",
      "Claude",
      "Gemini",
      "Llama",
      "language model",
      "chatbot",
      "transformer",
    ],
    sortOrder: 1,
  },
  {
    name: "Computer Vision",
    nameFr: "Vision par Ordinateur",
    nameAr: "الرؤية الحاسوبية",
    slug: "computer-vision",
    description: "Image recognition, object detection, video analysis",
    icon: "Eye",
    keywords: [
      "computer vision",
      "image recognition",
      "object detection",
      "YOLO",
      "diffusion",
      "Stable Diffusion",
      "DALL-E",
      "Midjourney",
    ],
    sortOrder: 2,
  },
  {
    name: "Robotics & Embodied AI",
    nameFr: "Robotique & IA Incarnée",
    nameAr: "الروبوتات والذكاء المجسد",
    slug: "robotics",
    description: "Humanoid robots, autonomous systems, embodied intelligence",
    icon: "Bot",
    keywords: [
      "robotics",
      "robot",
      "humanoid",
      "autonomous",
      "embodied AI",
      "Boston Dynamics",
      "Tesla Bot",
      "Figure",
    ],
    sortOrder: 3,
  },
  {
    name: "AI Agents & Automation",
    nameFr: "Agents IA & Automatisation",
    nameAr: "وكلاء الذكاء الاصطناعي والأتمتة",
    slug: "ai-agents",
    description: "Autonomous agents, workflow automation, tool use",
    icon: "Workflow",
    keywords: [
      "AI agent",
      "autonomous agent",
      "automation",
      "tool use",
      "function calling",
      "MCP",
      "agentic",
    ],
    sortOrder: 4,
  },
  {
    name: "AI Research & Papers",
    nameFr: "Recherche IA & Publications",
    nameAr: "أبحاث الذكاء الاصطناعي",
    slug: "research",
    description: "Academic papers, breakthroughs, benchmarks",
    icon: "GraduationCap",
    keywords: [
      "research",
      "paper",
      "arxiv",
      "benchmark",
      "SOTA",
      "state of the art",
      "breakthrough",
    ],
    sortOrder: 5,
  },
  {
    name: "AI Industry & Business",
    nameFr: "Industrie & Business IA",
    nameAr: "صناعة وأعمال الذكاء الاصطناعي",
    slug: "industry",
    description: "Funding, acquisitions, product launches, market trends",
    icon: "Building2",
    keywords: [
      "funding",
      "acquisition",
      "startup",
      "launch",
      "business",
      "market",
      "valuation",
      "IPO",
    ],
    sortOrder: 6,
  },
  {
    name: "AI Ethics & Safety",
    nameFr: "Éthique & Sécurité IA",
    nameAr: "أخلاقيات وسلامة الذكاء الاصطناعي",
    slug: "ethics-safety",
    description: "Alignment, regulation, bias, responsible AI",
    icon: "Shield",
    keywords: [
      "ethics",
      "safety",
      "alignment",
      "regulation",
      "bias",
      "responsible AI",
      "EU AI Act",
      "governance",
    ],
    sortOrder: 7,
  },
  {
    name: "Generative AI & Creative",
    nameFr: "IA Générative & Créative",
    nameAr: "الذكاء الاصطناعي التوليدي والإبداعي",
    slug: "generative",
    description: "Image, video, music, 3D generation",
    icon: "Sparkles",
    keywords: [
      "generative",
      "Stable Diffusion",
      "Midjourney",
      "DALL-E",
      "Sora",
      "music generation",
      "3D generation",
      "Runway",
    ],
    sortOrder: 8,
  },
  {
    name: "Open Source AI",
    nameFr: "IA Open Source",
    nameAr: "الذكاء الاصطناعي مفتوح المصدر",
    slug: "open-source",
    description: "Open models, frameworks, datasets, community",
    icon: "Github",
    keywords: [
      "open source",
      "Hugging Face",
      "Meta AI",
      "Llama",
      "Mistral",
      "open weights",
      "community",
    ],
    sortOrder: 9,
  },
  {
    name: "AI Coding & DevTools",
    nameFr: "IA pour le Code & Outils Dev",
    nameAr: "الذكاء الاصطناعي للبرمجة وأدوات المطورين",
    slug: "coding",
    description: "Code assistants, IDE integrations, developer tools",
    icon: "Code",
    keywords: [
      "Copilot",
      "Cursor",
      "Claude Code",
      "coding",
      "developer tools",
      "IDE",
      "code generation",
      "Devin",
    ],
    sortOrder: 10,
  },
] as const;

// ─────────────────────────────────────────────
// Billing Plans
// ─────────────────────────────────────────────

interface PlanSeed {
  name: string;
  nameFr: string;
  nameAr: string;
  slug: PlanSlug;
  price: number;
  yearlyPrice: number;
  currency: string;
  features: string[];
  limits: Record<string, unknown>;
  sortOrder: number;
}

const plans: PlanSeed[] = [
  {
    name: "Free",
    nameFr: "Gratuit",
    nameAr: "مجاني",
    slug: "free",
    price: 0,
    yearlyPrice: 0,
    currency: "USD",
    features: [
      "5 articles per day",
      "Email notifications only",
      "3 categories max",
      "Basic dashboard",
    ],
    limits: {
      articles_per_day: 5,
      max_categories: 3,
      max_sources: 5,
      max_alerts: 0,
      channels: ["email"],
      api_requests_per_day: 0,
    },
    sortOrder: 1,
  },
  {
    name: "Pro",
    nameFr: "Pro",
    nameAr: "احترافي",
    slug: "pro",
    price: 9,
    yearlyPrice: 86,
    currency: "USD",
    features: [
      "Unlimited articles",
      "WhatsApp + Email + Telegram",
      "All categories",
      "10 custom alerts",
      "AI Chat (50 messages/day)",
      "Publish articles (5/month)",
      "Weekly PDF report",
      "Priority processing",
    ],
    limits: {
      articles_per_day: -1,
      max_categories: -1,
      max_sources: -1,
      max_alerts: 10,
      channels: ["email", "whatsapp", "telegram"],
      api_requests_per_day: 0,
      chat_messages_per_day: 50,
      chat_history_days: 30,
      ai_tokens_per_month: 100000,
      published_articles_per_month: 5,
      max_images_per_article: 3,
      max_videos_per_article: 1,
      storage_mb: 100,
    },
    sortOrder: 2,
  },
  {
    name: "Team",
    nameFr: "Équipe",
    nameAr: "فريق",
    slug: "team",
    price: 29,
    yearlyPrice: 278,
    currency: "USD",
    features: [
      "Everything in Pro",
      "Up to 5 team members",
      "Shared dashboard",
      "API access (1000 req/day)",
      "AI Chat (200 messages/day)",
      "Publish articles (20/month)",
      "Custom sources",
      "Advanced analytics",
    ],
    limits: {
      articles_per_day: -1,
      max_categories: -1,
      max_sources: -1,
      max_alerts: 50,
      max_team_members: 5,
      channels: ["email", "whatsapp", "telegram"],
      api_requests_per_day: 1000,
      chat_messages_per_day: 200,
      chat_history_days: 90,
      ai_tokens_per_month: 500000,
      published_articles_per_month: 20,
      max_images_per_article: 10,
      max_videos_per_article: 3,
      storage_mb: 1024,
    },
    sortOrder: 3,
  },
  {
    name: "Enterprise",
    nameFr: "Entreprise",
    nameAr: "مؤسسات",
    slug: "enterprise",
    price: 99,
    yearlyPrice: 950,
    currency: "USD",
    features: [
      "Everything in Team",
      "Unlimited team members",
      "SSO integration",
      "Unlimited API",
      "Unlimited AI Chat",
      "Unlimited publishing",
      "Dedicated support",
      "Custom integrations",
    ],
    limits: {
      articles_per_day: -1,
      max_categories: -1,
      max_sources: -1,
      max_alerts: -1,
      max_team_members: -1,
      channels: ["email", "whatsapp", "telegram", "push"],
      api_requests_per_day: -1,
      chat_messages_per_day: -1,
      chat_history_days: -1,
      ai_tokens_per_month: -1,
      published_articles_per_month: -1,
      max_images_per_article: -1,
      max_videos_per_article: -1,
      storage_mb: -1,
    },
    sortOrder: 4,
  },
];

// ─────────────────────────────────────────────
// Main seed function
// ─────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("Seeding categories...");
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: {
        name: cat.name,
        nameFr: cat.nameFr,
        nameAr: cat.nameAr,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        keywords: [...cat.keywords],
        sortOrder: cat.sortOrder,
      },
      update: {
        name: cat.name,
        nameFr: cat.nameFr,
        nameAr: cat.nameAr,
        description: cat.description,
        icon: cat.icon,
        keywords: [...cat.keywords],
        sortOrder: cat.sortOrder,
      },
    });
  }
  console.log(`Seeded ${categories.length} categories`);

  console.log("Seeding billing plans...");
  for (const plan of plans) {
    await prisma.billingPlan.upsert({
      where: { slug: plan.slug },
      create: {
        name: plan.name,
        nameFr: plan.nameFr,
        nameAr: plan.nameAr,
        slug: plan.slug,
        price: plan.price,
        yearlyPrice: plan.yearlyPrice,
        currency: plan.currency,
        features: plan.features,
        limits: plan.limits,
        sortOrder: plan.sortOrder,
      },
      update: {
        name: plan.name,
        nameFr: plan.nameFr,
        nameAr: plan.nameAr,
        price: plan.price,
        yearlyPrice: plan.yearlyPrice,
        features: plan.features,
        limits: plan.limits,
        sortOrder: plan.sortOrder,
      },
    });
  }
  console.log(`Seeded ${plans.length} billing plans`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
