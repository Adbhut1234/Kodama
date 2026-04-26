"""
LUMINA AI — Python API Bridge
Receives JSON requests from Electron via stdin, processes them,
and returns JSON results via stdout.

All print/stdout from library code is captured to avoid corrupting
the JSON response.
"""

import sys
import io
import json
import os
import re
# ── Configuration ─────────────────────────────────────────────────────────────
KODAMA_DATA_DIR = os.environ.get("KODAMA_DATA_DIR", os.path.dirname(os.path.abspath(__file__)))
HISTORY_DIR = KODAMA_DATA_DIR
HISTORY_PATH = os.path.join(KODAMA_DATA_DIR, "kodama_history.json")
CONFIG_PATH = os.path.join(KODAMA_DATA_DIR, "kodama_config.json")

def main():
    # Read request from stdin
    raw_input = sys.stdin.read()
    if not raw_input: return
    request = json.loads(raw_input)
    action = request.get("action")

    # Capture all stdout from libraries (search_internet prints, etc.)
    real_stdout = sys.stdout
    sys.stdout = io.StringIO()

    try:
        result = handle_action(action, request)
    except Exception as e:
        err_msg = str(e)
        if "Failed to connect" in err_msg:
            err_msg = "FAILED TO CONNECT TO LLM."
        result = {"error": err_msg}
    finally:
        # Restore stdout and print ONLY the JSON result
        sys.stdout = real_stdout
        print(json.dumps(result, ensure_ascii=False))


def handle_action(action, request):
    if action == "status":
        return check_status()
    elif action == "chat":
        return handle_chat(request)
    elif action == "list_models":
        return list_models()
    elif action == "switch_model":
        return switch_model(request)

    elif action == "generate_pdf":
        return handle_pdf(request)
    else:
        return {"error": f"Unknown action: {action}"}


# ── Neural Link State ─────────────────────────────────────────────────────────


def check_status():
    import ollama
    import utils
    try:
        models = ollama.list()
        return {"status": "online", "model": utils.MODEL_NAME}
    except Exception as e:
        return {"status": "offline", "error": str(e)}


def list_models():
    import ollama
    from utils import MODEL_NAME
    try:
        response = ollama.list()
        # Handle both dict and object response types from different library versions
        models_raw = []
        if isinstance(response, dict):
            models_raw = response.get('models', [])
        else:
            models_raw = getattr(response, 'models', [])

        models = []
        for m in models_raw:
            # Extract attributes carefully
            name = getattr(m, 'model', getattr(m, 'name', str(m)))
            size = getattr(m, 'size', 0)
            m_at = str(getattr(m, 'modified_at', ''))
            
            models.append({
                "name": name,
                "size": size,
                "modified_at": m_at
            })
        return {"models": models, "active_model": MODEL_NAME}
    except Exception as e:
        return {"error": str(e)}


def switch_model(request):
    import utils
    new_model = request.get("model")
    if not new_model: return {"error": "No model specified"}
    
    # Update memory
    utils.MODEL_NAME = new_model
    
    # Update config file
    config_path = os.path.join(HISTORY_DIR, "kodama_config.json")
    config = {}
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except: pass
    
    config["model"] = new_model
    config["setup_complete"] = True
    
    try:
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
        return {"success": True, "active_model": new_model}
    except Exception as e:
        return {"error": str(e)}


def handle_chat(request):
    import ollama
    import utils
    from utils import search_internet, should_search

    messages = request.get("messages", [])
    user_text = request.get("user_text", "").strip()
    
    # ── Intent Routing (Autonomous Document & Web Synthesis) ──────────────────
    query_lower = user_text.lower()
    
    # PPT/PDF Routing — flexible keyword detection
    ppt_match = re.search(r'\b(ppt|powerpoint|presentation|slide)\b', query_lower)
    if ppt_match:
        # Extract optional slide count (e.g. "15 slides", "of 10 slides")
        slide_count_match = re.search(r'(\d+)\s*slides?', query_lower)
        num_slides = int(slide_count_match.group(1)) if slide_count_match else 5
        num_slides = max(3, min(num_slides, 20))  # clamp to 3–20

        # Strip boilerplate to extract the real topic
        topic = re.sub(
            r'(make|create|generate|build|prepare|give me|write|design)\s+'
            r'(a\s+|an\s+|me\s+|the\s+)?'
            r'(detailed\s+|professional\s+|comprehensive\s+)?'
            r'(ppt|powerpoint|presentation|slide)\s*'
            r'(of\s+\d+\s*slides?\s*)?'
            r'(about|on|for|regarding|of)?\s*',
            '', query_lower, count=1
        ).strip(' .,;:')
        if not topic:
            topic = "Synthesis Archive"
        return handle_ppt({"topic": topic, "num_slides": num_slides})

    pdf_match = re.search(r'\b(pdf|report|document)\b', query_lower)
    if pdf_match and re.search(r'\b(make|create|generate|build|prepare|write)\b', query_lower):
        topic = re.sub(
            r'(make|create|generate|build|prepare|give me|write)\s+'
            r'(a\s+|an\s+|me\s+|the\s+)?'
            r'(detailed\s+|professional\s+|comprehensive\s+)?'
            r'(pdf|report|document)\s*'
            r'(about|on|for|regarding)?\s*',
            '', query_lower, count=1
        ).strip(' .,;:')
        if not topic:
            topic = "Technical Report"
        return handle_pdf({"topic": topic})

    # Manual Search Routing
    force_search = False
    if query_lower.startswith(("search web for", "search for", "lookup", "web search", "internet search")):
        force_search = True
        user_text = re.sub(r'^(search web for|search for|lookup|web search|internet search)\s+', '', query_lower).strip()

    # ── Standard Chat with Search ─────────────────────────────────────────────
    searched = False
    search_results = None
    if force_search or should_search(user_text):
        searched = True
        search_results = search_internet(user_text)

    api_messages = [
        {
            "role": "system",
            "content": (
                "You are Kodama AI, a premium coding and synthesis assistant. "
                "Be concise, helpful, and technically precise. "
                "If given search results, use them to answer accurately."
            ),
        }
    ]
    api_messages.extend(messages[-20:])

    if search_results and api_messages:
        api_messages[-1] = {
            "role": "user",
            "content": (
                f"Answer using these internet search results:\n\n"
                f"{search_results}\n\n"
                f"My question: {user_text}"
            ),
        }

    response = ollama.chat(
        model=utils.MODEL_NAME,
        messages=api_messages,
        options={"temperature": 0.3, "num_predict": 1000},
    )

    return {
        "content": response["message"]["content"],
        "searched": searched,
    }





def handle_pdf(request):
    from document_generator import create_pdf
    topic = request.get("topic", "Untitled")
    filename = create_pdf(topic)
    return {"filename": os.path.abspath(filename)}


if __name__ == "__main__":
    main()
