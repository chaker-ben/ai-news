"""Tests for Phase 2 collectors — pure functions only (no DB dependency)."""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional
from unittest.mock import MagicMock, AsyncMock, patch
from xml.etree import ElementTree

import pytest


# ── Twitter hash ──

def generate_tweet_hash(tweet_id: str) -> str:
    return hashlib.sha256(f"twitter|{tweet_id}".encode()).hexdigest()


class TestTwitterCollector:
    """Tests for Twitter collector pure functions."""

    def test_generate_tweet_hash_deterministic(self):
        h1 = generate_tweet_hash("123456")
        h2 = generate_tweet_hash("123456")
        assert h1 == h2

    def test_different_tweets_different_hash(self):
        h1 = generate_tweet_hash("111")
        h2 = generate_tweet_hash("222")
        assert h1 != h2

    def test_hash_is_sha256(self):
        h = generate_tweet_hash("test")
        assert len(h) == 64


# ── YouTube hash ──

def generate_video_hash(video_id: str) -> str:
    return hashlib.sha256(f"youtube|{video_id}".encode()).hexdigest()


class TestYouTubeCollector:
    """Tests for YouTube collector pure functions."""

    def test_generate_video_hash_deterministic(self):
        h1 = generate_video_hash("dQw4w9WgXcQ")
        h2 = generate_video_hash("dQw4w9WgXcQ")
        assert h1 == h2

    def test_different_videos_different_hash(self):
        h1 = generate_video_hash("abc123")
        h2 = generate_video_hash("xyz789")
        assert h1 != h2


# ── Reddit hash ──

def generate_reddit_hash(post_id: str) -> str:
    return hashlib.sha256(f"reddit|{post_id}".encode()).hexdigest()


class TestRedditCollector:
    """Tests for Reddit collector pure functions."""

    def test_generate_reddit_hash_deterministic(self):
        h1 = generate_reddit_hash("t3_abc")
        h2 = generate_reddit_hash("t3_abc")
        assert h1 == h2

    def test_different_posts_different_hash(self):
        h1 = generate_reddit_hash("post_1")
        h2 = generate_reddit_hash("post_2")
        assert h1 != h2

    def test_subreddits_list_not_empty(self):
        from workers.src.collectors.reddit_collector import AI_SUBREDDITS
        assert len(AI_SUBREDDITS) > 0
        assert "MachineLearning" in AI_SUBREDDITS
        assert "artificial" in AI_SUBREDDITS


# ── Arxiv hash and parsing ──

def generate_arxiv_hash(arxiv_id: str) -> str:
    return hashlib.sha256(f"arxiv|{arxiv_id}".encode()).hexdigest()


SAMPLE_ARXIV_XML = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/2403.12345v1</id>
    <title>A Novel Approach to Large Language Model Alignment</title>
    <summary>We present a new method for aligning LLMs with human preferences...</summary>
    <published>2026-03-22T10:00:00Z</published>
    <author><name>John Doe</name></author>
    <author><name>Jane Smith</name></author>
    <arxiv:primary_category term="cs.AI" />
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2403.67890v1</id>
    <title>Scaling Laws for Neural Machine Translation</title>
    <summary>We investigate scaling laws in NMT systems...</summary>
    <published>2026-03-21T15:00:00Z</published>
    <author><name>Alice Johnson</name></author>
    <arxiv:primary_category term="cs.CL" />
  </entry>
</feed>"""


class TestArxivCollector:
    """Tests for Arxiv collector pure functions."""

    def test_generate_arxiv_hash_deterministic(self):
        h1 = generate_arxiv_hash("2403.12345v1")
        h2 = generate_arxiv_hash("2403.12345v1")
        assert h1 == h2

    def test_different_papers_different_hash(self):
        h1 = generate_arxiv_hash("2403.12345v1")
        h2 = generate_arxiv_hash("2403.67890v1")
        assert h1 != h2

    def test_parse_arxiv_xml_entries(self):
        """Test that we can parse Arxiv Atom XML."""
        ATOM_NS = "{http://www.w3.org/2005/Atom}"
        root = ElementTree.fromstring(SAMPLE_ARXIV_XML)
        entries = root.findall(f"{ATOM_NS}entry")
        assert len(entries) == 2

    def test_parse_arxiv_entry_title(self):
        ATOM_NS = "{http://www.w3.org/2005/Atom}"
        root = ElementTree.fromstring(SAMPLE_ARXIV_XML)
        entry = root.findall(f"{ATOM_NS}entry")[0]
        title = entry.find(f"{ATOM_NS}title").text.strip()
        assert "Large Language Model" in title

    def test_parse_arxiv_entry_authors(self):
        ATOM_NS = "{http://www.w3.org/2005/Atom}"
        root = ElementTree.fromstring(SAMPLE_ARXIV_XML)
        entry = root.findall(f"{ATOM_NS}entry")[0]
        authors = [a.find(f"{ATOM_NS}name").text for a in entry.findall(f"{ATOM_NS}author")]
        assert "John Doe" in authors
        assert "Jane Smith" in authors

    def test_parse_arxiv_entry_id(self):
        ATOM_NS = "{http://www.w3.org/2005/Atom}"
        root = ElementTree.fromstring(SAMPLE_ARXIV_XML)
        entry = root.findall(f"{ATOM_NS}entry")[0]
        paper_id = entry.find(f"{ATOM_NS}id").text.strip()
        arxiv_id = paper_id.split("/abs/")[-1]
        assert arxiv_id == "2403.12345v1"

    def test_ai_categories_defined(self):
        from workers.src.collectors.arxiv_collector import AI_CATEGORIES
        assert "cs.AI" in AI_CATEGORIES
        assert "cs.LG" in AI_CATEGORIES
        assert "cs.CL" in AI_CATEGORIES


# ── Cross-collector tests ──

class TestHashUniqueness:
    """Ensure hashes from different sources never collide."""

    def test_same_id_different_sources_different_hash(self):
        """Same ID '123' from different sources must produce different hashes."""
        tweet_hash = generate_tweet_hash("123")
        video_hash = generate_video_hash("123")
        reddit_hash = generate_reddit_hash("123")
        arxiv_hash = generate_arxiv_hash("123")

        hashes = {tweet_hash, video_hash, reddit_hash, arxiv_hash}
        assert len(hashes) == 4, "Hashes from different sources should never collide"
