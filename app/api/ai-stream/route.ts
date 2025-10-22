import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-3ba7e.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log(`[AI Stream] Starting stream to: ${BACKEND_URL}/ai/generate`);
    
    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Make request to Railway backend
          const response = await fetch(`${BACKEND_URL}/ai/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[AI Stream] Backend error: ${response.status} - ${errorText}`);
            controller.enqueue(new TextEncoder().encode(`data: Error: ${response.statusText}\n\n`));
            controller.close();
            return;
          }

          const data = await response.json();
          const fullResponse = data.response || '';
          
          // Stream character by character to preserve ALL spacing
          // DO NOT trim or modify the response - send it verbatim
          for (let i = 0; i < fullResponse.length; i++) {
            const char = fullResponse[i];
            controller.enqueue(new TextEncoder().encode(`data: ${char}\n\n`));
            
            // Small delay for streaming effect (adjust as needed)
            await new Promise(resolve => setTimeout(resolve, 5));
          }
          
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('[AI Stream] Error:', error);
          controller.enqueue(
            new TextEncoder().encode(`data: Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`)
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
