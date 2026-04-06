import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com';

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.message?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const enableSearch = typeof body.enable_search === 'boolean' ? body.enable_search : true;
    const conversationId = body.conversation_id;
    const systemPrompt = body.system_prompt;

    // Filter out messages with empty content — the Anthropic API rejects them
    const validHistory = (Array.isArray(body.conversation_history) ? body.conversation_history : [])
      .filter((msg: { role: string; content: string }) => msg.content?.trim() !== '')
      .map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content,
      }));

    const backendPayload = {
      messages: [
        ...validHistory,
        { role: 'user', content: body.message.trim() },
      ],
      max_tokens: body.max_tokens || 2048,
      temperature: body.temperature ?? 0.7,
      enable_search: enableSearch,
      ...(systemPrompt ? { system_prompt: systemPrompt } : {}),
      ...(conversationId ? { conversation_id: conversationId } : {}),
    };

    const response = await fetch(`${BACKEND_URL}/ai/stream/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Backend error: ${response.status}`);
    }

    // ── Fixed TransformStream ──────────────────────────────────────────
    // Buffers incomplete lines across chunks so JSON never gets split mid-parse
    let buffer = '';

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        buffer += new TextDecoder().decode(chunk);

        // Process only complete lines — hold the rest in buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // last element may be incomplete

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const raw = line.slice(6).trim();
          if (!raw || raw === '[DONE]') {
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            continue;
          }

          try {
            const data = JSON.parse(raw);

            const textChunk =
              (typeof data.text === 'string' && data.text) ||
              (typeof data.content === 'string' && data.content) ||
              (data.delta && (data.delta.text || data.delta.content)) ||
              null;

            if (textChunk) {
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ content: textChunk })}\n\n`
                )
              );
            } else if (data.type === 'done') {
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            } else if (data.type === 'error') {
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ error: data.error })}\n\ndata: [DONE]\n\n`
                )
              );
            }
          } catch {
            // incomplete or non-JSON line — skip
          }
        }
      },

      // Flush any remaining buffer when the stream closes
      flush(controller) {
        if (buffer.startsWith('data: ')) {
          const raw = buffer.slice(6).trim();
          if (raw && raw !== '[DONE]') {
            try {
              const data = JSON.parse(raw);
              const textChunk = data.text || data.content || null;
              if (textChunk) {
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({ content: textChunk })}\n\n`
                  )
                );
              }
            } catch { /* ignore */ }
          }
        }
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
      },
    });

    return new Response(response.body.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('[AI Stream] Error:', error);
    return new Response(
      `data: ${JSON.stringify({ error: 'Streaming failed' })}\n\ndata: [DONE]\n\n`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/event-stream' },
      }
    );
  }
}
