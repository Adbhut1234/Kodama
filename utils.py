"""
Shared utilities for the local AI assistant.
Contains common functions used across chat, search, and document generation modules.
"""

import re
import ollama
from ddgs import DDGS

# ── Configuration ─────────────────────────────────────────────────────────────
import os
import json
KODAMA_DATA_DIR = os.environ.get("KODAMA_DATA_DIR", os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(KODAMA_DATA_DIR, "kodama_config.json")

def _get_model():
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get("model", "qwen2.5-coder:7b")
        except: pass
    return "qwen2.5-coder:7b"

MODEL_NAME = _get_model()

# Keywords that trigger an internet search
SEARCH_KEYWORDS = [
    "latest", "newest", "recent", "current", "now",
    "today", "2024", "2025", "2026", "news",
    "update", "version", "release", "best right now",
    "who is", "what happened", "when did"
]


# ── Internet Search ───────────────────────────────────────────────────────────
def search_internet(query):
    """Search DuckDuckGo and return formatted results."""
    print(f"\n🔍 Searching internet for: {query}\n")
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=5))

        if not results:
            print("⚠️ No results found")
            return None

        context = ""
        for i, r in enumerate(results, 1):
            context += f"[{i}] {r['title']}\n{r['body']}\nSource: {r['href']}\n\n"

        print("✅ Search successful!\n")
        return context
    except Exception as e:
        print(f"❌ Search error: {e}")
        return None


def should_search(message):
    """Check if a message contains keywords that should trigger an internet search."""
    return any(k in message.lower() for k in SEARCH_KEYWORDS)


def add_custom_keyword(keyword):
    """Add a custom search trigger keyword at runtime."""
    SEARCH_KEYWORDS.append(keyword.lower())
    print(f"✅ Added '{keyword}' to search triggers")


# ── LLM Helpers ───────────────────────────────────────────────────────────────
def clean_json_string(raw):
    """Attempt to clean and repair common LLM JSON errors."""
    if not raw: return "{}"
    # Remove markdown code blocks if present
    raw = re.sub(r'```json\s*|\s*```', '', raw)
    # Find the first { and last }
    start = raw.find('{')
    end = raw.rfind('}')
    if start != -1 and end != -1:
        raw = raw[start:end+1]
    
    # Basic repairs for common trailing commas or escaping issues
    raw = raw.replace(',\s*}', '}')
    raw = raw.replace(',\s*]', ']')
    return raw


def ask_llm(prompt, temperature=0.3, num_predict=2000, format=None):
    """Send a prompt to the local LLM and return the response text."""
    try:
        kwargs = {
            "model": MODEL_NAME,
            "messages": [{"role": "user", "content": prompt}],
            "options": {
                "temperature": temperature, 
                "num_predict": num_predict,
                "num_ctx": 4096 # Ensure enough context for long reports
            }
        }
        # Note: We avoid strict format="json" for universal compatibility with smaller models
        response = ollama.chat(**kwargs)
        return response["message"]["content"]
    except Exception as e:
        print(f"❌ LLM Error: {e}")
        return ""


def chat_with_search(user_message):
    """Chat function with optional internet search augmentation."""
    search_results = None

    if should_search(user_message):
        search_results = search_internet(user_message)
    else:
        print("💡 Answering from own knowledge...\n")

    if search_results:
        full_message = f"""Answer my question using ONLY the information below.
Do NOT mention your training data or knowledge cutoff.
Just answer directly using the facts provided.

FACTS FROM INTERNET RIGHT NOW:
{search_results}

MY QUESTION: {user_message}

Answer:"""
    else:
        full_message = user_message

    return ask_llm(full_message, temperature=0.1, num_predict=500)


# ── File Utilities ────────────────────────────────────────────────────────────
def sanitize_filename(name):
    """Convert a topic string into a safe filename (no extension)."""
    return re.sub(r'[^\w\-.]', '_', name).strip('_')
