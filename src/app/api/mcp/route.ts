import { NextRequest, NextResponse } from 'next/server';
// Removed unused imports: sessions, house, resources

// Handle GET requests to /api/mcp
export async function GET(req: NextRequest) {
  console.log('=== MCP GET REQUEST RECEIVED ===');
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers)));
  
  try {
    console.log('Returning MCP info response');
    return NextResponse.json({
      jsonrpc: "2.0",
      result: {
        description: "MCP Server Example - House Resource",
        version: "1.0.0"
      }
    });
  } catch (error) {
    console.error('Error in GET /api/mcp:', error);
    return NextResponse.json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal server error",
        data: String(error)
      }
    }, { status: 500 });
  }
}

// Handle POST requests to /api/mcp
export async function POST(req: NextRequest) {
  console.log('=== MCP POST REQUEST RECEIVED ===');
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers)));
  
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
  
  try {
    // If it's an initialize request
    if (rpcRequest.method === 'initialize') {
      console.log('Handling initialize method');
      return NextResponse.json({
        jsonrpc: "2.0",
        id: rpcRequest.id,
        result: {
          protocolVersion: "2025-03-26",
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
            prompts: { listChanged: false }
          },
          serverInfo: {
            name: "House Exploration MCP",
            version: "1.0.0"
          }
        }
      });
    }
    
    // For tools/list
    if (rpcRequest.method === 'tools/list') {
      console.log('Handling tools/list method');
      return NextResponse.json({
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
      });
    }
    
    // Handle tools/call by forwarding to the request handler
    if (rpcRequest.method === 'tools/call') {
      console.log('Handling tools/call method');
      console.log('Tool:', rpcRequest.params?.name);
      console.log('Arguments:', JSON.stringify(rpcRequest.params?.arguments || {}));
      
      const requestURL = new URL('/api/mcp/request', req.url);
      console.log('Forwarding to:', requestURL.toString());
      
      try {
        console.log('Sending request to handler');
        const response = await fetch(requestURL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: rpcRequest.id,
            method: rpcRequest.params.name,
            params: rpcRequest.params.arguments || {}
          }),
        });
        
        console.log('Response status:', response.status);
        const responseData = await response.clone().text();
        console.log('Response body:', responseData);
        
        console.log('Returning response from handler');
        return response;
      } catch (error) {
        console.error('Error forwarding request:', error);
        return NextResponse.json({
          jsonrpc: "2.0",
          id: rpcRequest.id,
          error: {
            code: -32603,
            message: "Error forwarding request",
            data: String(error)
          }
        }, { status: 500 });
      }
    }
    
    // Default error for unhandled methods
    console.log(`Unhandled method: ${rpcRequest.method}`);
    return NextResponse.json({
      jsonrpc: "2.0",
      id: rpcRequest.id || null,
      error: {
        code: -32601,
        message: `Method '${rpcRequest.method}' not found`
      }
    });
  } catch (error) {
    console.error('Error in POST /api/mcp:', error);
    return NextResponse.json({
      jsonrpc: "2.0",
      id: rpcRequest?.id || null,
      error: {
        code: -32603,
        message: "Internal server error",
        data: String(error)
      }
    }, { status: 500 });
  }
} 