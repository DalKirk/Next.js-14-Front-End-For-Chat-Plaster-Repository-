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
    
    // Transform to backend format
    const backendPayload = {
      messages: [
        ...(Array.isArray(body.conversation_history) ? body.conversation_history : []).map((msg: any) => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: body.message.trim()
        }
      ],
      max_tokens: 2048,
      temperature: 0.7
    };

    console.log(`[AI Stream] Calling: ${BACKEND_URL}/ai/stream/chat`);

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
        
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'content' && data.text) {
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify({ content: data.text })}\n\n`)
                );
              } else if (data.type === 'done') {
                controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
              } else if (data.type === 'error') {
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify({ error: data.error })}\n\n`)
                );
              }
            } catch (e) {
              // Skip parse errors
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
