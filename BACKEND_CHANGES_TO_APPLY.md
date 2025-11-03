# Backend Changes for Brave Search in Streaming

Apply these changes to your FastAPI backend repository to enable Brave search during streaming.

---

## File 1: `utils/streaming_ai_endpoints.py`

### Change 1: Add imports at the top of the file

**After your existing imports, add:**

```python
import os
import logging
from datetime import datetime
import httpx
```

### Change 2: Add Brave search helpers (after imports, before routes)

**Add this entire block:**

```python
# Brave Search Integration
BRAVE_SEARCH_KEY = os.getenv("BRAVE_SEARCH_API_KEY")
logger = logging.getLogger("streaming")
logger.setLevel(logging.INFO)

def brave_enabled() -> bool:
    """Check if Brave Search is configured"""
    return bool(BRAVE_SEARCH_KEY)

async def brave_search(query: str, count: int = 5) -> List[Dict[str, Any]]:
    """Fetch web search results from Brave API"""
    if not brave_enabled() or not query:
        return []
    
    headers = {"X-Subscription-Token": BRAVE_SEARCH_KEY}
    params = {"q": query, "count": count, "source": "web"}
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                headers=headers,
                params=params
            )
            resp.raise_for_status()
            data = resp.json()
            web_results = (data.get("web", {}) or {}).get("results", []) or []
            
            results = []
            for r in web_results[:count]:
                results.append({
                    "title": r.get("title", "").strip(),
                    "url": r.get("url", "").strip(),
                    "snippet": r.get("snippet", "").strip(),
                })
            return results
    except Exception as e:
        logger.warning(f"Brave search failed: {e}")
        return []

def format_search_context(results: List[Dict[str, Any]]) -> str:
    """Format search results for injection into system prompt"""
    if not results:
        return ""
    
    lines = ["Web context (Brave):"]
    for i, r in enumerate(results, 1):
        title = r.get("title", "")
        url = r.get("url", "")
        snippet = r.get("snippet", "")
        lines.append(f"{i}. {title} — {snippet} [ref: {url}]")
    
    lines.append("\nCite sources with [ref: URL]. If details conflict, say so explicitly.")
    return "\n".join(lines)
```

### Change 3: Update StreamChatRequest model

**Find this:**
```python
class StreamChatRequest(BaseModel):
    model: str
    messages: List[Dict[str, Any]]
    system: Optional[str] = None
```

**Replace with:**
```python
class StreamChatRequest(BaseModel):
    model: str
    messages: List[Dict[str, Any]]
    system: Optional[str] = None
    enable_search: Optional[bool] = True
    conversation_id: Optional[str] = None
```

### Change 4: Update StreamGenerateRequest model

**Find this:**
```python
class StreamGenerateRequest(BaseModel):
    model: str
    prompt: str
    system_prompt: Optional[str] = None
```

**Replace with:**
```python
class StreamGenerateRequest(BaseModel):
    model: str
    prompt: str
    system_prompt: Optional[str] = None
    enable_search: Optional[bool] = True
    conversation_id: Optional[str] = None
```

### Change 5: Inject search in /chat endpoint

**In your `/ai/stream/chat` endpoint, right after parsing the request and BEFORE calling your model, add:**

```python
# Extract last user message for search query
user_text = ""
for m in reversed(req.messages):
    if m.get("role") == "user":
        content = m.get("content")
        if isinstance(content, str):
            user_text = content
        elif isinstance(content, list):
            user_text = " ".join([
                c.get("text", "") 
                for c in content 
                if isinstance(c, dict) and c.get("type") == "text"
            ])
        break

# Build system prompt with optional Brave search results
injected_system = (req.system or "").strip()
search_results = []

if req.enable_search and brave_enabled() and user_text:
    search_results = await brave_search(user_text, count=5)
    search_context = format_search_context(search_results)
    if search_context:
        if injected_system:
            injected_system = f"{injected_system}\n\n{search_context}"
        else:
            injected_system = search_context

logger.info(
    f"stream_chat: enable_search={req.enable_search}, "
    f"query_present={bool(user_text)}, "
    f"results={len(search_results)}"
)
```

**Then find where you call your streaming client (e.g., Anthropic/Claude):**

**Change from:**
```python
system=req.system,
```

**To:**
```python
system=injected_system,
```

### Change 6: Inject search in /generate endpoint

**In your `/ai/stream/generate` endpoint, right after parsing the request and BEFORE calling your model, add:**

```python
# Build system prompt with optional Brave search results
injected_system = (req.system_prompt or "").strip()
search_results = []

if req.enable_search and brave_enabled() and req.prompt:
    search_results = await brave_search(req.prompt, count=5)
    search_context = format_search_context(search_results)
    if search_context:
        if injected_system:
            injected_system = f"{injected_system}\n\n{search_context}"
        else:
            injected_system = search_context

logger.info(
    f"stream_generate: enable_search={req.enable_search}, "
    f"prompt_present={bool(req.prompt)}, "
    f"results={len(search_results)}"
)
```

**Then find where you call your streaming client:**

**Change from:**
```python
system=req.system_prompt,
```

**To:**
```python
system=injected_system,
```

### Change 7: Update /health endpoint

**Find this:**
```python
@router.get("/health")
async def stream_health():
    return {"ok": True, "time": datetime.utcnow().isoformat()}
```

**Replace with:**
```python
@router.get("/health")
async def stream_health():
    return {
        "ok": True,
        "time": datetime.utcnow().isoformat(),
        "brave_search_enabled": brave_enabled()
    }
```

---

## File 2: `api/routes/chat.py` (optional, for non-stream parity)

**In your `/api/v1/chat` endpoint (or equivalent), add enable_search forwarding:**

**Find where you call AIService:**
```python
response = await svc.generate_response(
    messages=body.get("messages") or [],
    system=body.get("system"),
    conversation_id=body.get("conversation_id"),
)
```

**Replace with:**
```python
enable_search = body.get("enable_search", True)
response = await svc.generate_response(
    messages=body.get("messages") or [],
    system=body.get("system"),
    conversation_id=body.get("conversation_id"),
    enable_search=enable_search,
)
```

---

## Summary

### Critical changes (must do):
1. ✅ Add Brave search helpers to `utils/streaming_ai_endpoints.py`
2. ✅ Add `enable_search` and `conversation_id` fields to request models
3. ✅ Inject search results into `system` parameter before streaming (both /chat and /generate)
4. ✅ Update health endpoint to expose `brave_search_enabled`

### Optional changes:
5. Pass `enable_search` in REST chat endpoint for consistency

### Testing:
```bash
# 1. Check health
curl https://your-backend.railway.app/ai/stream/health

# Expected: { "ok": true, "time": "...", "brave_search_enabled": true }

# 2. Test streaming with search
# Ask: "What are the latest AI developments in November 2025?"
# Expected: Citations like [ref: https://...] appear in streamed response

# 3. Test with search disabled
# Send same question with enable_search: false
# Expected: No citations, just knowledge cutoff response
```

---

## Key Points

- **The one critical change:** Replace `system=req.system` (or `system=req.system_prompt`) with `system=injected_system` in your streaming calls
- **Why it works:** Your frontend already sends `enable_search: true`, so once the backend injects Brave results into the system prompt, Claude will use them
- **Validation:** Check logs for "stream_chat: enable_search=True, query_present=True, results=5" to confirm search is running

If you have questions about a specific line or need help finding where your streaming call happens, share that code snippet and I'll pinpoint it.
