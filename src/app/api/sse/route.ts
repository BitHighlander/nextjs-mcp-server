import { NextRequest } from 'next/server';
import { sessions } from '@/lib/mcp-data';

// Create a ReadableStream for Server-Sent Events
export async function GET(req: NextRequest) {
  console.log('=== ROOT SSE REQUEST RECEIVED ===');
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('URL:', req.url);
  
  try {
    console.log('Creating TextEncoder');
    const encoder = new TextEncoder();
    
    console.log('Creating ReadableStream');
    const stream = new ReadableStream({
      start(controller) {
        console.log('Stream started');
        try {
          // Generate a session ID
          const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
          console.log(`[SSE] New connection established with sessionId: ${sessionId}`);
          
          // Store SSE controller for later use
          console.log('Storing session');
          sessions.set(sessionId, { 
            controller, 
            initialized: false 
          });
          console.log('Session stored:', sessions.has(sessionId));

          // Send initial ping to keep connection alive
          console.log('Sending initial ping');
          controller.enqueue(encoder.encode(`: ping\n\n`));
          console.log('Initial ping sent');

          // Send the endpoint event with message path
          console.log('Sending endpoint event');
          controller.enqueue(encoder.encode(`event: endpoint\n`));
          controller.enqueue(encoder.encode(`data: /api/message?sessionId=${sessionId}\n\n`));
          console.log('Endpoint event sent');

          // Set up heartbeat interval
          console.log('Setting up heartbeat');
          const heartbeat = setInterval(() => {
            try {
              console.log('Sending heartbeat');
              controller.enqueue(encoder.encode(`: heartbeat\n\n`));
            } catch (e) {
              // Connection might be closed
              console.error('Heartbeat error:', e);
              clearInterval(heartbeat);
              sessions.delete(sessionId);
              console.log(`[SSE] Heartbeat failed for sessionId: ${sessionId}`);
            }
          }, 3000);
          console.log('Heartbeat interval set');

          // Clean up on connection close
          console.log('Setting up abort listener');
          req.signal.addEventListener('abort', () => {
            console.log('Connection aborted');
            clearInterval(heartbeat);
            sessions.delete(sessionId);
            console.log(`[SSE] Connection closed for sessionId: ${sessionId}`);
          });
          console.log('Abort listener set');
        } catch (error) {
          console.error('Error in stream start:', error);
          controller.error(error);
        }
      },
      cancel() {
        console.log('Stream cancelled');
      }
    });
    console.log('ReadableStream created');

    console.log('Creating Response with headers');
    const response = new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
      }
    });
    console.log('Response created, returning');
    
    return response;
  } catch (error) {
    console.error('=== SSE CRITICAL ERROR ===');
    console.error(error);
    
    // Return a basic error response instead of throwing
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: String(error) }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 