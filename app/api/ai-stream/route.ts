import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-3ba7e.up.railway.app';

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
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
    
    console.log(`[AI Stream] Request body:`, JSON.stringify(body, null, 2));
    console.log(`[AI Stream] conversation_id:`, body.conversation_id); // NEW: Log conversation_id
    
    // Validate required fields
    if (!body.message || typeof body.message !== 'string' || !body.message.trim()) {
      console.error('[AI Stream] Invalid message:', body.message);
      return new Response(
        JSON.stringify({ error: 'Message is required and cannot be empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[AI Stream] Starting stream to: ${BACKEND_URL}/api/v1/chat`);
    
    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Make request to Railway backend
          const response = await fetch(`${BACKEND_URL}/api/v1/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: body.message.trim(),
              conversation_history: Array.isArray(body.conversation_history) ? body.conversation_history : [],
              conversation_id: body.conversation_id // NEW: Forward conversation_id
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[AI Stream] Backend error: ${response.status} - ${errorText}`);
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: response.statusText })}\n\n`));
            controller.close();
            return;
          }

          const data = await response.json();
          console.log('[AI Stream] Backend response data:', JSON.stringify(data, null, 2));
          
          const fullResponse = data.response || data.message || data.content || '';
          console.log('[AI Stream] Extracted response:', fullResponse);
          
          if (!fullResponse) {
            console.error('[AI Stream] No response content found in:', data);
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: 'No response content received from backend' })}\n\n`));
            controller.close();
            return;
          }
          
          // Send complete formatted response at once
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ 
              content: fullResponse, 
              format_type: data.format_type || 'structured',
              conversation_id: data.conversation_id // NEW: Return conversation_id
            })}\n\n`)
          );
          
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('[AI Stream] Error:', error);
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[AI Stream] Setup error:', error);
    return new Response(
      JSON.stringify({ error: 'Stream setup failed', message: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
