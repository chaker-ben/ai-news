"""Shared AI keyword lists used by collectors and processors."""
from __future__ import annotations

# Keywords for filtering AI-related content (collection stage — broad)
AI_KEYWORDS: list[str] = [
    "ai", "artificial intelligence", "machine learning", "deep learning",
    "llm", "large language model", "gpt", "gemini", "claude", "agi",
    "neural network", "transformer", "diffusion", "generative ai",
    "chatbot", "copilot", "openai", "anthropic", "google ai", "meta ai",
    "deepmind", "hugging face", "stable diffusion", "midjourney",
    "reinforcement learning", "computer vision", "nlp",
    "natural language processing", "robotics", "autonomous",
    # Dev-focused
    "api", "sdk", "framework", "open source", "developer", "coding",
    "programming", "software engineering", "devtools", "ide",
    "agent", "ai agent", "mcp", "model context protocol",
    "rag", "retrieval augmented", "fine-tuning", "fine tuning",
    "prompt engineering", "langchain", "llamaindex", "vector database",
    "embedding", "inference", "deployment", "mlops",
    # Business / Trends
    "startup", "funding", "acquisition", "valuation", "series a",
    "enterprise ai", "ai strategy", "digital transformation",
    "ai regulation", "ai safety", "ai governance", "ai ethics",
]

# Dev/Business profile — high relevance keywords (scoring boost)
PROFILE_KEYWORDS: list[str] = [
    # AI for developers
    "api", "sdk", "framework", "library", "open source", "developer tool",
    "code generation", "coding assistant", "copilot", "cursor", "windsurf",
    "ai agent", "mcp", "tool use", "function calling",
    "rag", "retrieval augmented generation", "fine-tuning", "fine tuning",
    "prompt engineering", "langchain", "llamaindex", "crewai",
    "vector database", "embedding", "inference", "deployment",
    "mlops", "devops", "ci/cd", "testing",
    # New tech & models
    "new model", "release", "launch", "announce", "benchmark",
    "state-of-the-art", "sota", "breakthrough", "open source",
    "multimodal", "vision", "audio", "video generation",
    "reasoning", "chain of thought", "planning",
    # Best practices
    "best practice", "architecture", "design pattern", "scaling",
    "performance", "optimization", "cost reduction", "latency",
    "security", "privacy", "compliance", "responsible ai",
    # Business & Trends
    "startup", "funding", "acquisition", "partnership",
    "enterprise", "saas", "platform", "marketplace",
    "trend", "prediction", "forecast", "market",
    "ai regulation", "ai policy", "ai governance",
    "ai adoption", "roi", "use case", "case study",
]
