"""Arxiv collector for AI research papers."""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional
from xml.etree import ElementTree

import httpx
from sqlalchemy.orm import Session

from workers.src.config import settings
from workers.src.models.article import Article, Source

logger = logging.getLogger(__name__)

ARXIV_API_URL = "http://export.arxiv.org/api/query"

# Arxiv categories for AI research
AI_CATEGORIES: list[str] = [
    "cs.AI",   # Artificial Intelligence
    "cs.CL",   # Computation and Language (NLP)
    "cs.CV",   # Computer Vision
    "cs.LG",   # Machine Learning
    "cs.NE",   # Neural and Evolutionary Computing
    "stat.ML", # Machine Learning (Statistics)
]

# Atom XML namespace
ATOM_NS = "{http://www.w3.org/2005/Atom}"


def generate_arxiv_hash(arxiv_id: str) -> str:
    """Generate a unique hash for an Arxiv paper."""
    return hashlib.sha256(f"arxiv|{arxiv_id}".encode()).hexdigest()


async def search_arxiv(
    categories: Optional[list[str]] = None,
    max_results: int = 15,
) -> list[dict]:
    """Search for recent AI papers on Arxiv.

    Args:
        categories: List of Arxiv categories to search.
        max_results: Maximum papers to return.

    Returns:
        List of paper data dictionaries.
    """
    cats = categories or AI_CATEGORIES

    # Build query: (cat:cs.AI OR cat:cs.CL OR cat:cs.LG ...)
    cat_query = " OR ".join(f"cat:{cat}" for cat in cats)
    query = f"({cat_query})"

    params = {
        "search_query": query,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
        "max_results": max_results,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(ARXIV_API_URL, params=params)
            response.raise_for_status()

            root = ElementTree.fromstring(response.text)
            papers = []

            for entry in root.findall(f"{ATOM_NS}entry"):
                paper_id_elem = entry.find(f"{ATOM_NS}id")
                title_elem = entry.find(f"{ATOM_NS}title")
                summary_elem = entry.find(f"{ATOM_NS}summary")
                published_elem = entry.find(f"{ATOM_NS}published")

                if paper_id_elem is None or title_elem is None:
                    continue

                paper_id = paper_id_elem.text.strip()
                # Extract just the ID part (e.g., "2403.12345v1")
                arxiv_id = paper_id.split("/abs/")[-1] if "/abs/" in paper_id else paper_id

                # Get authors
                authors = []
                for author_elem in entry.findall(f"{ATOM_NS}author"):
                    name_elem = author_elem.find(f"{ATOM_NS}name")
                    if name_elem is not None and name_elem.text:
                        authors.append(name_elem.text.strip())

                # Get PDF link
                pdf_url = paper_id.replace("/abs/", "/pdf/") if "/abs/" in paper_id else paper_id

                # Get categories
                categories_found = []
                for cat_elem in entry.findall("{http://arxiv.org/schemas/atom}primary_category"):
                    term = cat_elem.get("term", "")
                    if term:
                        categories_found.append(term)

                papers.append({
                    "arxiv_id": arxiv_id,
                    "title": title_elem.text.strip().replace("\n", " "),
                    "summary": summary_elem.text.strip().replace("\n", " ") if summary_elem is not None and summary_elem.text else "",
                    "authors": authors[:5],  # Limit to first 5 authors
                    "published": published_elem.text.strip() if published_elem is not None and published_elem.text else "",
                    "url": paper_id,
                    "pdf_url": pdf_url,
                    "categories": categories_found,
                })

            logger.info("Fetched %d papers from Arxiv", len(papers))
            return papers

    except Exception:
        logger.exception("Arxiv search failed")
        return []


async def collect_arxiv(db: Session, max_results: int = 15) -> list[Article]:
    """Collect recent AI papers from Arxiv and store as articles.

    Args:
        db: Database session.
        max_results: Maximum papers to fetch.

    Returns:
        List of newly collected Article instances.
    """
    papers = await search_arxiv(max_results=max_results)
    collected: list[Article] = []

    # Ensure Arxiv source exists
    source = db.query(Source).filter(Source.type == "arxiv", Source.active == True).first()
    if not source:
        source = Source(
            name="Arxiv AI Papers",
            type="arxiv",
            url="https://arxiv.org",
            active=True,
        )
        db.add(source)
        db.commit()

    for paper in papers:
        arxiv_id = paper["arxiv_id"]
        content_hash = generate_arxiv_hash(arxiv_id)

        existing = db.query(Article).filter(Article.content_hash == content_hash).first()
        if existing:
            continue

        # Parse date
        try:
            published_at = datetime.fromisoformat(
                paper["published"].replace("Z", "+00:00")
            )
        except (ValueError, AttributeError):
            published_at = datetime.now(timezone.utc)

        authors_str = ", ".join(paper["authors"]) if paper["authors"] else "Unknown"
        title = paper["title"]
        summary = paper.get("summary", "")

        article = Article(
            source_id=source.id,
            source_type="arxiv",
            original_title=f"[Arxiv] {title}",
            original_content=f"Authors: {authors_str}\n\n{summary}",
            url=paper["url"],
            published_at=published_at,
            content_hash=content_hash,
        )
        db.add(article)
        collected.append(article)
        logger.info("Collected paper: %s", title[:60])

    source.last_collected = datetime.now(timezone.utc)
    db.commit()

    logger.info("Arxiv: collected %d new papers", len(collected))
    return collected
