# Star Identity & TTS Fixes

## Overview
Three files updated to fix Star calling herself Claude and TTS cutting off responses early.

---

## Files Changed

### 1. `hooks/useVoiceMobile.ts`

| Fix | Details |
|-----|---------|
| **speakingRef guard** | Prevents double-speak — if `speakingRef.current` is true, `speak()` returns immediately |
| **Dynamic safety timeout** | Calculates timeout from word count: `max(20s, (words/150) * 60s + 8s)`. A 30-word response gets ~20s instead of a fixed 15s that cut it off |
| **doneCalled flag** | Prevents `done()` firing twice (from both poll and onended) |
| **300ms polling** | Polls every 300ms instead of 500ms — catches audio end faster on mobile |
| **[pause] stripping** | `[pause]` and `[пауза]` stripped from text before sending to TTS |

### 2. `components/UnifiedAIPanel.tsx`

| Fix | Details |
|-----|---------|
| **Star identity** | `AI_SYSTEM_PROMPT` now explicitly says: "Your name is Star. You were created by Starcyeed." |
| **Name enforcement** | "Never correct users about your name — your name is Star, not Claude." |
| **Company blocking** | "NEVER refer to yourself as Claude, never mention Anthropic, OpenAI, or any AI company or model." |
| **Language** | Responds in the same language the user writes in (was previously English-only) |

### 3. `agent_endpoints.py` (backend)

| Fix | Details |
|-----|---------|
| **Same identity instructions** | Agent system prompt now matches chat: Star identity, no Claude references |
| **Consistent behavior** | Both chat and agent Star have the same identity rules |

---

## Commits

| Commit | Message |
|--------|---------|
| `d18c967` | fix: Star identity prompt + dynamic TTS timeout + double-speak guard |
| `8d4b528` | fix: clear conversation history on panel close and strip [pause] tags |

---

## Result
- Star stops calling herself Claude
- Longer voice responses no longer get cut off at 15 seconds
- No duplicate audio playback on mobile
- Audio end detection is faster (300ms vs 500ms)
- Both chat and agent tabs use consistent Star identity
