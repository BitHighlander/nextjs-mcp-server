import { NextRequest, NextResponse } from 'next/server';
import { house, resources } from '@/lib/mcp-data';

// Handle POST requests to /api/mcp/request
export async function POST(req: NextRequest) {
  console.log('=== MCP REQUEST HANDLER RECEIVED REQUEST ===');
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
  
  // Basic validation
  if (!rpcRequest || !rpcRequest.method) {
    console.error('Invalid request: missing method');
    return NextResponse.json({
      jsonrpc: "2.0",
      id: rpcRequest?.id || null,
      error: {
        code: -32600,
        message: "Invalid request"
      }
    });
  }

  try {
    console.log('Processing method:', rpcRequest.method);
    
    // Process different methods
    switch (rpcRequest.method) {
      case 'house.getDetails':
        console.log('Handling house.getDetails');
        return NextResponse.json({
          jsonrpc: "2.0",
          id: rpcRequest.id,
          result: {
            description: house.description,
            roomCount: house.rooms.length
          }
        });
        
      case 'house.getRooms':
        console.log('Handling house.getRooms');
        return NextResponse.json({
          jsonrpc: "2.0",
          id: rpcRequest.id,
          result: house.rooms.map(room => ({
            id: room.id,
            name: room.name
          }))
        });
        
      case 'house.getRoom':
        console.log('Handling house.getRoom');
        const roomId = rpcRequest.params?.id;
        const password = rpcRequest.params?.password;
        
        console.log('Room ID:', roomId);
        console.log('Password provided:', password ? 'Yes' : 'No');
        
        if (!roomId) {
          console.log('Missing room ID parameter');
          return NextResponse.json({
            jsonrpc: "2.0",
            id: rpcRequest.id,
            error: {
              code: -32602,
              message: "Room ID is required"
            }
          });
        }
        
        const room = house.rooms.find(r => r.id === roomId);
        if (!room) {
          console.log(`Room ${roomId} not found`);
          return NextResponse.json({
            jsonrpc: "2.0",
            id: rpcRequest.id,
            error: {
              code: -32602,
              message: `Room ${roomId} not found`
            }
          });
        }
        
        // Check password for room 5
        if (room.id === 5 && room.requiresPassword) {
          console.log('Checking password for room 5');
          if (password !== 'foobar123') {
            console.log('Invalid password for room 5');
            return NextResponse.json({
              jsonrpc: "2.0",
              id: rpcRequest.id,
              error: {
                code: -32602,
                message: "Password required for room 5"
              }
            });
          }
          console.log('Password accepted for room 5');
        }
        
        console.log(`Returning details for room ${roomId}`);
        return NextResponse.json({
          jsonrpc: "2.0",
          id: rpcRequest.id,
          result: {
            id: room.id,
            name: room.name,
            description: room.description,
            items: room.hasItems ? room.items : []
          }
        });
        
      case 'getPassword':
        console.log('Handling getPassword');
        return NextResponse.json({
          jsonrpc: "2.0",
          id: rpcRequest.id,
          result: "foobar123"
        });

      case 'resources.list':
        console.log('Handling resources.list');
        const resourcesList = Object.values(resources).map(r => ({
          id: r.id,
          name: r.name,
          description: r.description
        }));
        console.log(`Found ${resourcesList.length} resources`);
        
        return NextResponse.json({
          jsonrpc: "2.0",
          id: rpcRequest.id,
          result: resourcesList
        });
        
      case 'resources.get':
        console.log('Handling resources.get');
        const resourceId = rpcRequest.params?.id as keyof typeof resources | undefined;
        console.log('Resource ID:', resourceId);
        
        if (!resourceId) {
          console.log('Missing resource ID parameter');
          return NextResponse.json({
            jsonrpc: "2.0",
            id: rpcRequest.id,
            error: {
              code: -32602,
              message: "Resource ID is required"
            }
          });
        }
        
        const resource = resources[resourceId];
        if (!resource) {
          console.log(`Resource ${resourceId} not found`);
          return NextResponse.json({
            jsonrpc: "2.0",
            id: rpcRequest.id,
            error: {
              code: -32602,
              message: `Resource ${resourceId} not found`
            }
          });
        }
        
        console.log(`Returning resource ${resourceId}`);
        return NextResponse.json({
          jsonrpc: "2.0",
          id: rpcRequest.id,
          result: {
            id: resource.id,
            name: resource.name,
            description: resource.description,
            content: resource.content
          }
        });

      // Handle other methods
      default:
        console.log(`Method not found: ${rpcRequest.method}`);
        return NextResponse.json({
          jsonrpc: "2.0",
          id: rpcRequest.id,
          error: {
            code: -32601,
            message: `Method '${rpcRequest.method}' not found`
          }
        });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({
      jsonrpc: "2.0",
      id: rpcRequest.id || null,
      error: {
        code: -32603,
        message: "Internal server error",
        data: String(error)
      }
    }, { status: 500 });
  }
} 