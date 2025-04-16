# Next.js MCP Server

A Motion Control Protocol (MCP) server implementation using Next.js. This server can be integrated with Cursor as an external tool provider.

## Features

- Server-Sent Events (SSE) for real-time communication
- JSON-RPC compliant API for tool invocation
- House exploration example with rooms, items, and resources
- Compatible with Cursor's MCP requirements

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. The MCP server will be running at:
   - Base MCP endpoint: `http://localhost:3000/api/mcp`
   - SSE connection: `http://localhost:3000/`
   - Message endpoint: `http://localhost:3000/api/message`

## Connecting with Cursor

To connect this MCP server with Cursor:

1. Make sure your server is running (`npm run dev`)
2. In Cursor, go to Settings > Tools > Motion Control Protocol
3. Add a new MCP server with the URL: `http://localhost:3000`
4. The presence of a `mcp.json` file in the root directory will help Cursor recognize this as an MCP server

## Available Tools

The server provides the following tools:

- `house.getDetails` - Get general information about the house
- `house.getRooms` - List all rooms (basic info)
- `house.getRoom` - Get details about a specific room
- `getPassword` - Get the password for accessing room 5
- `resources.list` - List all available resources
- `resources.get` - Get a specific resource by ID

## Implementation Details

This MCP server is based on Next.js App Router and uses:

- API Routes for JSON-RPC endpoints
- Server-Sent Events for real-time communication
- Next.js streaming responses
- TypeScript for type safety

## License

MIT

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
