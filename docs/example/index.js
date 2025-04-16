const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Store active SSE sessions
const sessions = new Map();

// Verbose request logger middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log('\n==== INCOMING REQUEST ====', timestamp);
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Query:', JSON.stringify(req.query, null, 2));
  console.log('==========================\n');
  
  // Capture and log the response
  const originalSend = res.send;
  res.send = function(body) {
    console.log('\n==== OUTGOING RESPONSE ====', new Date().toISOString());
    console.log('Status:', res.statusCode);
    console.log('Body:', body);
    console.log('===========================\n');
    return originalSend.call(this, body);
  };
  
  next();
});

// SSE endpoint at root path
app.get('/', (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  // Generate a session ID
  const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  console.log(`[SSE] New connection established with sessionId: ${sessionId}`);
  
  // Store the SSE response object for later use
  sessions.set(sessionId, { 
    sseRes: res, 
    initialized: false 
  });

  // First send a comment to keep the connection alive
  res.write(`: ping\n\n`);

  // Send the endpoint event with message path
  res.write(`event: endpoint\n`);
  res.write(`data: /message?sessionId=${sessionId}\n\n`);

  // Heartbeat every 3 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 3000);

  // Clean up on connection close
  req.on('close', () => {
    clearInterval(heartbeat);
    sessions.delete(sessionId);
    console.log(`[SSE] Connection closed for sessionId: ${sessionId}`);
  });
});

// Message endpoint to handle JSON-RPC over SSE
app.post('/message', (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) {
    return res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: "Missing sessionId parameter"
      }
    });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: "Invalid or expired session"
      }
    });
  }

  const sseRes = session.sseRes;
  const rpcRequest = req.body;

  // Send minimal HTTP acknowledgment
  res.json({
    jsonrpc: "2.0",
    id: rpcRequest.id,
    result: { ack: `Received ${rpcRequest.method}` }
  });

  try {
    // Process request and send actual response via SSE
    switch (rpcRequest.method) {
      case 'initialize':
        session.initialized = true;
        
        // Send ping first to keep connection alive
        sseRes.write(`: initialize ping\n\n`);
        
        sseRes.write(`event: message\n`);
        sseRes.write(`data: ${JSON.stringify({
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
        })}\n\n`);
        
        // Send another ping to ensure data flow
        sseRes.write(`: post-initialize ping\n\n`);
        
        break;

      case 'tools/list':
        sseRes.write(`event: message\n`);
        sseRes.write(`data: ${JSON.stringify({
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
        })}\n\n`);
        break;

      case 'tools/call':
        const toolName = rpcRequest.params?.name;
        const toolArgs = rpcRequest.params?.arguments || {};
        
        // Handle specific tool calls
        switch (toolName) {
          case 'house.getDetails':
            sseRes.write(`event: message\n`);
            sseRes.write(`data: ${JSON.stringify({
              jsonrpc: "2.0",
              id: rpcRequest.id,
              result: {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    description: house.description,
                    roomCount: house.rooms.length
                  })
                }]
              }
            })}\n\n`);
            break;
            
          case 'house.getRooms':
            sseRes.write(`event: message\n`);
            sseRes.write(`data: ${JSON.stringify({
              jsonrpc: "2.0",
              id: rpcRequest.id,
              result: {
                content: [{
                  type: "text",
                  text: JSON.stringify(house.rooms.map(room => ({
                    id: room.id,
                    name: room.name
                  })))
                }]
              }
            })}\n\n`);
            break;
            
          case 'house.getRoom':
            const roomId = toolArgs?.id;
            const password = toolArgs?.password;
            
            if (!roomId) {
              sseRes.write(`event: message\n`);
              sseRes.write(`data: ${JSON.stringify({
                jsonrpc: "2.0",
                id: rpcRequest.id,
                error: {
                  code: -32602,
                  message: "Room ID is required"
                }
              })}\n\n`);
              break;
            }
            
            const room = house.rooms.find(r => r.id === roomId);
            if (!room) {
              sseRes.write(`event: message\n`);
              sseRes.write(`data: ${JSON.stringify({
                jsonrpc: "2.0",
                id: rpcRequest.id,
                error: {
                  code: -32602,
                  message: `Room ${roomId} not found`
                }
              })}\n\n`);
              break;
            }
            
            // Check password for room 5
            if (room.id === 5 && room.requiresPassword) {
              if (password !== 'foobar123') {
                sseRes.write(`event: message\n`);
                sseRes.write(`data: ${JSON.stringify({
                  jsonrpc: "2.0",
                  id: rpcRequest.id,
                  error: {
                    code: -32602,
                    message: "Password required for room 5"
                  }
                })}\n\n`);
                break;
              }
            }
            
            sseRes.write(`event: message\n`);
            sseRes.write(`data: ${JSON.stringify({
              jsonrpc: "2.0",
              id: rpcRequest.id,
              result: {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    id: room.id,
                    name: room.name,
                    description: room.description,
                    items: room.hasItems ? room.items : []
                  })
                }]
              }
            })}\n\n`);
            break;
            
          case 'getPassword':
            sseRes.write(`event: message\n`);
            sseRes.write(`data: ${JSON.stringify({
              jsonrpc: "2.0",
              id: rpcRequest.id,
              result: {
                content: [{
                  type: "text",
                  text: "foobar123"
                }]
              }
            })}\n\n`);
            break;
            
          case 'resources.list':
            sseRes.write(`event: message\n`);
            sseRes.write(`data: ${JSON.stringify({
              jsonrpc: "2.0",
              id: rpcRequest.id,
              result: {
                content: [{
                  type: "text",
                  text: JSON.stringify(Object.values(resources).map(r => ({
                    id: r.id,
                    name: r.name,
                    description: r.description
                  })))
                }]
              }
            })}\n\n`);
            break;
            
          case 'resources.get':
            const resourceId = toolArgs.id;
            if (!resourceId) {
              sseRes.write(`event: message\n`);
              sseRes.write(`data: ${JSON.stringify({
                jsonrpc: "2.0",
                id: rpcRequest.id,
                error: {
                  code: -32602,
                  message: "Resource ID is required"
                }
              })}\n\n`);
              break;
            }
            
            const resource = resources[resourceId];
            if (!resource) {
              sseRes.write(`event: message\n`);
              sseRes.write(`data: ${JSON.stringify({
                jsonrpc: "2.0",
                id: rpcRequest.id,
                error: {
                  code: -32602,
                  message: `Resource ${resourceId} not found`
                }
              })}\n\n`);
              break;
            }
            
            sseRes.write(`event: message\n`);
            sseRes.write(`data: ${JSON.stringify({
              jsonrpc: "2.0",
              id: rpcRequest.id,
              result: {
                content: [{
                  type: "text",
                  text: resource.content
                }]
              }
            })}\n\n`);
            break;
            
          default:
            sseRes.write(`event: message\n`);
            sseRes.write(`data: ${JSON.stringify({
              jsonrpc: "2.0",
              id: rpcRequest.id,
              error: {
                code: -32601,
                message: `No such tool '${toolName}'`
              }
            })}\n\n`);
        }
        break;
        
      default:
        sseRes.write(`event: message\n`);
        sseRes.write(`data: ${JSON.stringify({
          jsonrpc: "2.0",
          id: rpcRequest.id,
          error: {
            code: -32601,
            message: `Method '${rpcRequest.method}' not recognized`
          }
        })}\n\n`);
    }
  } catch (error) {
    res.status(500).json({
      jsonrpc: "2.0",
      id: rpcRequest.id,
      error: {
        code: -32603,
        message: "Internal server error",
        data: error.message
      }
    });
  }
});

// Our house resource data
const house = {
  description: "A lovely house with 5 rooms",
  rooms: [
    { id: 1, name: "Living Room", description: "A spacious room with a fireplace", hasItems: true, items: ["book", "remote"] },
    { id: 2, name: "Kitchen", description: "Modern kitchen with island", hasItems: true, items: ["key_to_bedroom", "apple"] },
    { id: 3, name: "Bedroom", description: "Master bedroom with bay windows", requiresKey: "key_to_bedroom", hasItems: true, items: ["pillow", "key_to_bathroom"] },
    { id: 4, name: "Bathroom", description: "Full bathroom with shower and tub", requiresKey: "key_to_bathroom", hasItems: true, items: ["soap", "key_to_secret_room"] },
    { id: 5, name: "Secret Room", description: "Password protected room", requiresPassword: true, requiresKey: "key_to_secret_room", hasItems: true, items: ["treasure"] }
  ],
  outside: {
    description: "You're standing outside a beautiful house. There's a front door leading inside."
  }
};

// Resources for the house
const resources = {
  'house_layout': {
    id: 'house_layout',
    name: 'House Layout',
    description: 'A diagram of the house layout showing all rooms and connections',
    content: `
    House Layout:
    ┌─────────────┐     ┌─────────────┐
    │             │     │             │
    │  Bedroom    │────►│  Bathroom   │
    │   (3)       │     │   (4)       │
    │             │     │             │
    └─────┬───────┘     └─────┬───────┘
          │                   │
          ▼                   ▼
    ┌─────────────┐     ┌─────────────┐
    │             │     │             │
    │  Living Room│────►│  Kitchen    │
    │   (1)       │     │   (2)       │
    │             │     │             │
    └─────┬───────┘     └─────────────┘
          │
          ▼
    ┌─────────────┐
    │             │
    │ Secret Room │
    │   (5)       │
    │             │
    └─────────────┘
    `
  },
  'navigation_guide': {
    id: 'navigation_guide',
    name: 'Navigation Guide',
    description: 'Instructions on how to move between rooms',
    content: `
    Navigation Guide:
    
    1. To enter the house from outside, use 'house.enterHouse'
    2. To move between rooms, use 'house.goToRoom' with the room ID
    3. To go back to the previous room, use 'house.goBack'
    4. To exit the house, use 'house.goOutside'
    
    Room Access Requirements:
    - Bedroom (3): Requires "key_to_bedroom" from the Kitchen
    - Bathroom (4): Requires "key_to_bathroom" from the Bedroom
    - Secret Room (5): Requires "key_to_secret_room" from the Bathroom AND the password
    
    To get the password, use the 'getPassword' tool.
    To use the password, use 'house.usePassword' when in front of room 5.
    `
  },
  'house_history': {
    id: 'house_history',
    name: 'House History',
    description: 'The story and background of the mysterious house',
    content: `
    House History:
    
    This house was built in 1897 by the eccentric inventor Dr. Maxwell Blackwood. 
    
    Legend says that Dr. Blackwood hid his most valuable invention in the secret room, 
    accessible only to those who could solve his series of puzzles spread throughout the house.
    
    Many have tried to reach the secret room, but few have succeeded in finding all the 
    keys and discovering the password needed to enter.
    
    The house has remained untouched for decades, waiting for someone clever enough to 
    unlock its mysteries.
    `
  },
  'item_guide': {
    id: 'item_guide',
    name: 'Item Guide',
    description: 'Information about items that can be found in the house',
    content: `
    Item Guide:
    
    - book: Found in the Living Room. An old journal with clues about the house.
    - remote: Found in the Living Room. Seems to control something.
    - key_to_bedroom: Found in the Kitchen. Unlocks the Bedroom door.
    - apple: Found in the Kitchen. Looks fresh despite the house's age.
    - pillow: Found in the Bedroom. Comfy but ordinary.
    - key_to_bathroom: Found in the Bedroom. Unlocks the Bathroom door.
    - soap: Found in the Bathroom. Smells like lavender.
    - key_to_secret_room: Found in the Bathroom. Unlocks the Secret Room door.
    - treasure: Found in the Secret Room. Dr. Blackwood's greatest invention!
    
    To pick up an item, use 'game.pickupItem' with the item name.
    `
  }
};

// Game state (persistent between requests)
const gameState = {
  currentLocation: "outside", // "outside" or room id (1-5)
  inventory: [],
  visited: ["outside"],
  previousLocation: null
};

// Main MCP endpoint for JSON-RPC requests
app.post('/mcp/request', (req, res) => {
  console.log('Received request:', req.body);
  
  const rpcRequest = req.body;
  
  // Basic validation
  if (!rpcRequest || !rpcRequest.method) {
    return res.status(400).json({
      jsonrpc: "2.0",
      id: rpcRequest?.id || null,
      error: {
        code: -32600,
        message: "Invalid request"
      }
    });
  }

  // Process different methods
  switch (rpcRequest.method) {
    case 'house.getDetails':
      return res.json({
        jsonrpc: "2.0",
        id: rpcRequest.id,
        result: {
          description: house.description,
          roomCount: house.rooms.length
        }
      });
      
    case 'house.getRooms':
      return res.json({
        jsonrpc: "2.0",
        id: rpcRequest.id,
        result: house.rooms.map(room => ({
          id: room.id,
          name: room.name
        }))
      });
      
    case 'house.getRoom':
      const roomId = rpcRequest.params?.id;
      const password = rpcRequest.params?.password;
      
      if (!roomId) {
        return res.json({
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
        return res.json({
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
        if (password !== 'foobar123') {
          return res.json({
            jsonrpc: "2.0",
            id: rpcRequest.id,
            error: {
              code: -32602,
              message: "Password required for room 5"
            }
          });
        }
      }
      
      return res.json({
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
      return res.json({
        jsonrpc: "2.0",
        id: rpcRequest.id,
        result: "foobar123"
      });

    case 'resources.list':
      return res.json({
        jsonrpc: "2.0",
        id: rpcRequest.id,
        result: Object.values(resources).map(r => ({
          id: r.id,
          name: r.name,
          description: r.description
        }))
      });
      
    case 'resources.get':
      const resourceId = rpcRequest.params?.id;
      
      if (!resourceId) {
        return res.json({
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
        return res.json({
          jsonrpc: "2.0",
          id: rpcRequest.id,
          error: {
            code: -32602,
            message: `Resource ${resourceId} not found`
          }
        });
      }
      
      return res.json({
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
      return res.json({
        jsonrpc: "2.0",
        id: rpcRequest.id,
        error: {
          code: -32601,
          message: `Method '${rpcRequest.method}' not found`
        }
      });
  }
});

// Add extra endpoints Cursor might be looking for
app.get('/mcp', (req, res) => {
  res.json({
    jsonrpc: "2.0",
    result: {
      description: "MCP Server Example - House Resource",
      version: "1.0.0"
    }
  });
});

app.post('/mcp', (req, res) => {
  console.log('Received request to /mcp:', req.body);
  
  const rpcRequest = req.body;
  
  // If it's an initialize request
  if (rpcRequest.method === 'initialize') {
    return res.json({
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
    return res.json({
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
  
  // Forward other requests to the main handler
  return app._router.handle(req, res, () => {});
});

// Start the server
app.listen(PORT, () => {
  console.log(`House Exploration MCP server running at http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST /mcp/request - JSON-RPC endpoint for direct method calls');
  console.log('  GET/POST /mcp - MCP protocol endpoints for Cursor integration');
});
