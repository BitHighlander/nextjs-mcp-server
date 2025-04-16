# MCP Server Example - House Resource

A simple MCP (Machine-Controlled Programs) server example with a house resource that has 5 rooms.

## Features
- House resource with 5 rooms
- Password protection for the 5th room
- Function to get the password (`getPassword`)

## Installation
```
npm install
```

## Running the server
```
npm start
```

Server runs on http://localhost:3001

## Available Methods
- `house.getDetails` - Get general information about the house
- `house.getRooms` - List all rooms (basic info)
- `house.getRoom` - Get details about a specific room (requires password for room 5)
- `getPassword` - Get the password for accessing room 5

## Example Usage
```bash
# Get house details
curl -X POST http://localhost:3001/mcp/request \
-H "Content-Type: application/json" \
-d '{
  "id": "1",
  "method": "house.getDetails",
  "params": {}
}'

# Get all rooms
curl -X POST http://localhost:3001/mcp/request \
-H "Content-Type: application/json" \
-d '{
  "id": "2",
  "method": "house.getRooms",
  "params": {}
}'

# Get a specific room (for room 5, password is required)
curl -X POST http://localhost:3001/mcp/request \
-H "Content-Type: application/json" \
-d '{
  "id": "3",
  "method": "house.getRoom",
  "params": {
    "id": 5,
    "password": "foobar123"
  }
}'

# Get the password
curl -X POST http://localhost:3001/mcp/request \
-H "Content-Type: application/json" \
-d '{
  "id": "4",
  "method": "getPassword",
  "params": {}
}'
```

## Integration with Cursor
To use this MCP server with Cursor:
1. Ensure the server is running (`npm start`)
2. Open the Command Palette in Cursor (Cmd+Shift+P or Ctrl+Shift+P)
3. Search for "Connect to MCP Server"
4. Enter `http://localhost:3001` 