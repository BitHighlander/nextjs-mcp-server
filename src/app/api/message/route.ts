import { NextRequest, NextResponse } from 'next/server';
import { sessions } from '@/lib/mcp-data';

// Handle JSON-RPC over SSE
export async function POST(req: NextRequest) {
  console.log('=== MESSAGE ROUTE REQUEST RECEIVED ===');
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers)));
  
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  console.log('SessionId from params:', sessionId);
  
  if (!sessionId) {
    console.error('Missing sessionId parameter');
    return NextResponse.json({
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: "Missing sessionId parameter"
      }
    }, { status: 400 });
  }

  console.log('Looking up session:', sessionId);
  const sessionKeys = await sessions.keys();
  console.log('Available sessions:', sessionKeys);
  
  const session = await sessions.get(sessionId);
  if (!session) {
    console.error('Invalid or expired session:', sessionId);
    return NextResponse.json({
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: "Invalid or expired session"
      }
    }, { status: 404 });
  }

  console.log('Session found, parsing request body');
  let rpcRequest;
  try {
    rpcRequest = await req.json();
    console.log('Request body:', JSON.stringify(rpcRequest));
  } catch (error) {
    console.error('Error parsing request body:', error);
    return NextResponse.json({
      jsonrpc: "2.0",
      error: {
        code: -32700,
        message: "Parse error"
      }
    }, { status: 400 });
  }

  console.log('Getting controller and creating encoder');
  const controller = session.controller;
  const encoder = new TextEncoder();

  // Check if controller exists
  if (!controller) {
    console.error('Controller not found for session:', sessionId);
    return NextResponse.json({
      jsonrpc: "2.0",
      id: rpcRequest.id,
      error: {
        code: -32603,
        message: "Session controller not available"
      }
    }, { status: 500 });
  }

  // Send minimal HTTP acknowledgment
  const response = {
    jsonrpc: "2.0",
    id: rpcRequest.id,
    result: { ack: `Received ${rpcRequest.method}` }
  };
  console.log('Prepared response:', JSON.stringify(response));

  try {
    console.log('Processing request method:', rpcRequest.method);
    // Process request and send actual response via SSE
    switch (rpcRequest.method) {
      case 'initialize':
        console.log('Handling initialize method');
        session.initialized = true;
        // Update session in Redis
        await sessions.set(sessionId, session);
        
        // Send ping first to keep connection alive
        console.log('Sending initialize ping');
        controller.enqueue(encoder.encode(`: initialize ping\n\n`));
        
        console.log('Sending initialize result');
        controller.enqueue(encoder.encode(`event: message\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          jsonrpc: "2.0",
          id: rpcRequest.id,
          result: {
            protocolVersion: "2024-11-05", // Match client protocol version
            capabilities: {
              tools: { listChanged: true },
              resources: { listChanged: true },
              prompts: { listChanged: false },
              logging: {}
            },
            serverInfo: {
              name: "House Exploration MCP",
              version: "1.0.0"
            }
          }
        })}\n\n`));
        
        // Send another ping to ensure data flow
        console.log('Sending post-initialize ping');
        controller.enqueue(encoder.encode(`: post-initialize ping\n\n`));
        console.log('Initialize method completed');
        break;

      case 'tools/list':
        console.log('Handling tools/list method');
        controller.enqueue(encoder.encode(`event: message\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          jsonrpc: "2.0",
          id: rpcRequest.id,
          result: {
            tools: [
              {
                name: "house.getDetails",
                description: "Get general information about the house",
                inputSchema: {
                  type: "object",
                  properties: {}
                }
              },
              {
                name: "house.getRooms",
                description: "List all rooms (basic info)",
                inputSchema: {
                  type: "object",
                  properties: {}
                }
              },
              {
                name: "house.getRoom",
                description: "Get details about a specific room",
                inputSchema: {
                  type: "object",
                  properties: {
                    id: {
                      type: "number",
                      description: "Room ID"
                    },
                    password: {
                      type: "string",
                      description: "Password (required for room 5)"
                    }
                  },
                  required: ["id"]
                }
              },
              {
                name: "getPassword",
                description: "Get the password for accessing room 5",
                inputSchema: {
                  type: "object",
                  properties: {}
                }
              },
              {
                name: "resources.list",
                description: "List all available resources",
                inputSchema: {
                  type: "object",
                  properties: {}
                }
              },
              {
                name: "resources.get",
                description: "Get a specific resource by ID",
                inputSchema: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      description: "Resource ID"
                    }
                  },
                  required: ["id"]
                }
              }
            ],
            count: 6
          }
        })}\n\n`));
        console.log('tools/list method completed');
        break;

      case 'tools/call':
        console.log('Handling tools/call method');
        // Forward to the request handler and send response via SSE
        const toolName = rpcRequest.params?.name;
        const toolArgs = rpcRequest.params?.arguments || {};
        
        console.log(`Tool call: ${toolName}`, JSON.stringify(toolArgs));
        
        const requestBody = {
          jsonrpc: "2.0",
          id: rpcRequest.id,
          method: toolName,
          params: toolArgs
        };
        
        console.log('Forwarding to request handler:', JSON.stringify(requestBody));
        console.log('Request URL:', req.url);
        const toolResponse = await fetch(new URL('/api/mcp/request', req.url), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        console.log('Request handler response status:', toolResponse.status);
        const toolResult = await toolResponse.json();
        console.log('Tool result:', JSON.stringify(toolResult));
        
        controller.enqueue(encoder.encode(`event: message\n`));
        if (toolResult.error) {
          console.log('Sending error response');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(toolResult)}\n\n`));
        } else {
          console.log('Sending success response');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            jsonrpc: "2.0",
            id: rpcRequest.id,
            result: {
              content: [{
                type: "text",
                text: JSON.stringify(toolResult.result)
              }]
            }
          })}\n\n`));
        }
        console.log('tools/call method completed');
        break;
        
      default:
        console.log(`Unrecognized method: ${rpcRequest.method}`);
        controller.enqueue(encoder.encode(`event: message\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          jsonrpc: "2.0",
          id: rpcRequest.id,
          error: {
            code: -32601,
            message: `Method '${rpcRequest.method}' not recognized`
          }
        })}\n\n`));
        console.log('Default method handler completed');
    }
    console.log('Request processing completed successfully');
  } catch (error: Error | unknown) {
    console.error('Error processing request:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    return NextResponse.json({
      jsonrpc: "2.0",
      id: rpcRequest.id,
      error: {
        code: -32603,
        message: "Internal server error",
        data: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }

  console.log('Returning acknowledgment response');
  return NextResponse.json(response);
} 