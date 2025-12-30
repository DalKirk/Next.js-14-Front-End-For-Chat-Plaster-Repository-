import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-3ba7e.up.railway.app';

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
    
    console.log(`[AI Stream] Switching to TRUE streaming endpoint`);
    
    if (!body.message?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Transform to backend format and forward flags
    const enableSearch = typeof body.enable_search === 'boolean' ? body.enable_search : true;
    const conversationId = body.conversation_id;

    const backendPayload = {
      messages: [
        ...(Array.isArray(body.conversation_history) ? body.conversation_history : []).map((msg: {role: string; content: string}) => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: body.message.trim()
        }
      ],
      max_tokens: 2048,
      temperature: 0.7,
      // Forward through to backend so it can enable tools like Brave Search
      enable_search: enableSearch,
      ...(conversationId ? { conversation_id: conversationId } : {})
    };

    console.log(`[AI Stream] Calling: ${BACKEND_URL}/ai/stream/chat`);
    console.log(`[AI Stream] Payload:`, JSON.stringify({
      ...backendPayload,
      // avoid dumping the entire history/log; log only sizes/flags
      messages_preview: `${backendPayload.messages.length} messages (redacted)`
    }, null, 2));

    const response = await fetch(`${BACKEND_URL}/ai/stream/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload),
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    // Transform backend SSE to frontend format
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        console.log('[AI Stream] Raw backend chunk:', text);
        
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('[AI Stream] Parsed data:', data);
              
              // Normalize various backend chunk formats to { content }
              const textChunk =
                (data && typeof data === 'object' && data.text) ||
                (data && typeof data === 'object' && data.content) ||
                (data && typeof data === 'object' && data.delta && (data.delta.text || data.delta.content));

              if (textChunk) {
                const transformed = `data: ${JSON.stringify({ content: textChunk })}\n\n`;
                console.log('[AI Stream] Sending content chunk');
                controller.enqueue(new TextEncoder().encode(transformed));
              } else if (data.type === 'done') {
                console.log('[AI Stream] Sending DONE signal');
                controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
              } else if (data.type === 'error') {
                console.log('[AI Stream] Sending error:', data.error);
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify({ error: data.error })}\n\n`)
                );
                // Also send DONE after error
                controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
              } else {
                // Unknown chunk type: ignore or log for diagnostics
                console.log('[AI Stream] Unknown chunk format, ignoring');
              }
            } catch (e) {
              console.error('[AI Stream] Parse error:', e);
            }
          }
        }
      }
    });

    return new Response(response.body?.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[AI Stream] Error:', error);
    return new Response(
      `data: ${JSON.stringify({ error: 'Streaming failed' })}\n\ndata: [DONE]\n\n`,
      { 
        status: 500,
        headers: { 'Content-Type': 'text/event-stream' }
      }
    );
  }
}
