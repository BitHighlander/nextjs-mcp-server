
projectsaturnstudios
9d
For anyone on the strugglebus in any language having connection issues with getting SSE working within your project, here’s what worked for me -

Firstly, this solution involves redis.
Secondly, this solution should work on single threaded languages, I’m just using PHP 8.2 if you’re using PHP, Im sure ReactPHP or Laravel Octane would make things even better.

Next, when the Agent/Client pings your server at the entry URL, that’s where you set up your session, open a stream and push out to that stream the uri you want it to send POSTs messages to. Don’t close it! For me, I made a data object containing the session id and a “queue” array of event objects to process and saved the object to the cache. DB might work too, but we’re aiming for no migrations. Make your stream loop and check that session object for a non empty set of pending events and process the next or just keep looping

When the client responds again with a POST call to the messages URL with. an initialize method request, you validate and process the request by loading your session dataobject with the queue in it and add a new event that was the product of your processing and then save the object back into the cache and return an empty 202 Accepted response.

The post call will return nothing but successfully and your stream on the other “request” will end up sending the event to the stream that’s opened. From there, the MCP client will complain at your craptastically formed, request or it will move on!

I hope this helps anyone about to throw their closest AI powered device out the fricken window (not in this economy!)

cedrazgabriel
opened 3 days ago
Describe the bug
I build the server following exactly what is written in the documentation in the README, but whenever I try to connect to the server using the MCP Client from Cursor through the configured endpoint, it returns an error message saying the session ID was not found in the transport array:

To Reproduce
Segue código do meu index.ts


import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { registerAllTools } from "./tools";

export const server = new McpServer({
name: "mcp-clickup-helper",
version: "1.0.0"
});

registerAllTools()

const app = express();

const transports: {[sessionId: string]: SSEServerTransport} = {};

app.get("/sse", async (_: Request, res: Response) => {
const transport = new SSEServerTransport('/messages', res);
transports[transport.sessionId] = transport;
res.on("close", () => {
delete transports[transport.sessionId];
});
await server.connect(transport);
});

app.post("/messages", async (req: Request, res: Response) => {
const sessionId = req.query.sessionId as string;
const transport = transports[sessionId];
if (transport) {
await transport.handlePostMessage(req, res);
} else {
res.status(400).send('No transport found for sessionId');
}
});

app.listen(3000, () => {
console.error("MCP Server running with sse transport");
});
Logs

[error] rver: Client error for command Error POSTing to endpoint (HTTP 400): No transport found for sessionId
2025-04-10 15:16:03.791 [error] rver: Error in MCP: Error POSTing to endpoint (HTTP 400): No transport found for sessionId
2025-04-10 15:16:03.792 [info] rver: Client closed for command
2025-04-10 15:16:03.792 [error] rver: Error in MCP: Client closed
2025-04-10 15:16:03.792 [error] rver: Failed to reload client: Error POSTing to endpoint (HTTP 400): No transport found for sessionId
2025-04-10 15:16:03.801 [info] rver: Handling ListOfferings action
Activity
cedrazgabriel
added
bug
Something isn't working
3 days ago
VladyslavKochetkov
VladyslavKochetkov commented 3 days ago
VladyslavKochetkov
3 days ago
This may honestly be a Cursor issue, for me disabling and enabling the MCP Server in Cursor fixed it.

cedrazgabriel
cedrazgabriel commented 3 days ago
cedrazgabriel
3 days ago
Author
've disabled and enabled the mcp server several times, but I always get the same log. I really think it might be a bug.

Image

VladyslavKochetkov
VladyslavKochetkov commented 3 days ago
VladyslavKochetkov
3 days ago
What is your .cursor/mcp.json file?

VladyslavKochetkov
VladyslavKochetkov commented 3 days ago
VladyslavKochetkov
3 days ago · edited by VladyslavKochetkov
@cedrazgabriel

Hmm yeah I tried to plug in your MCP and I got the same error, but I have a very similar setup. I wonder if whoever your proxy is is intercepting and messing with query params or headers. I noticed that cursor sends a BUNCH of /sse requests, like

Server started on port 3000
Transport created b74e7b77-fb05-41bd-8ab8-d4e82a4f7680
Transport created 7676146e-1678-4ec0-b403-8ab0111d70ff
Transport created ba05446e-69c6-4a58-a8bd-d89cb0c9f5ba
Transport created 2d77ec97-70c9-497c-a628-3615126cf3c3
Transport created d0a54f12-28ea-4625-ad45-9b4016d3e26c
Transport created d6ee6595-c082-45c4-9c19-770f5887f002
Transport created 8e73d79a-ba16-4b00-b40a-014fd2287bef
Transport created ee841d0c-ffce-47a5-bf17-1cb5024883f1
Transport created 0ebbc66d-3a5a-4d00-a1b1-4e2e83973f1d
Transport created 43f99f5a-271e-47e4-95f2-9a08f8706cc2
Transport created 51c6c20b-96c4-4dcf-a9a4-ea1e7a436491
Transport created 2bf6d2c4-3df9-43cf-ac0d-38554edb2d44
Transport created 975b4478-2be5-4d02-82c5-872606214466
and will periodically fail because a transport gets terminated due to inactivity, but to help with all this I added a separate GET handler to return sessions, that could maybe help you debug it as well.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express, { Request, Response } from "express";

const server = new McpServer({
name: "...",
version: "1.0.0",
capabilities: {
tools: {},
},
});

// Tooling goes here

const app = express();

const transports = new Map<string, SSEServerTransport>();

app.get("/sse", (_, res) => {
const transport = new SSEServerTransport("/messages", res);
console.log("Transport created", transport.sessionId);

transports.set(transport.sessionId, transport);

res.on("close", () => {
console.log("Transport closed", transport.sessionId);
transports.delete(transport.sessionId);
});

server.connect(transport);

const originalOnMessage = transport.onmessage;
transport.onmessage = (message) => {
console.log("/sse message: ", message);
originalOnMessage?.(message);
};
});

app.post("/messages", async (req, res) => {
const sessionId = req.query.sessionId as string;
const transport = transports.get(sessionId);

if (transport) {
await transport.handlePostMessage(req, res);
} else {
res.status(400).send("No transport found for sessionId");
}
});

app.get("/sessions", (_req: Request, res: Response) => {
res.json(Array.from(transports.keys()));
});

app.get("/", (_, res) => {
res.send("Healthy");
});

app.listen(3000, "localhost", () => {
console.log("Server started on port 3000");
});
and you can test this in postman to see where the error lies, and you would see logs from cursor invoking your MCP.

http://localhost:3000/sse - this creates a stream and the first message is your sessionId, you can grab it and then
http://localhost:3000/messages?sessionId={streamid from step one} - you can send a request here, like a tool call

{
"jsonrpc": "2.0",
"id": 0,
"method": "tools/call",
"params": {
"name": "domain-is-available",
"arguments": {
// you tool params
}
}
}
http://localhost:3000/sessions - lets you get all your current sessions

VladyslavKochetkov
VladyslavKochetkov commented 3 days ago
VladyslavKochetkov
3 days ago
You can also update the /sse endpoint to print all data coming out of the server

app.get("/sse", (_, res) => {
const transport = new SSEServerTransport("/messages", res);
console.log("\nTransport created", transport.sessionId);

// overwrite write to create a logger
const originalWrite = res.write;
res.write = (chunk, ...args) => {
console.log({
type: "sse stream write",
for: transport.sessionId,
chunk,
});
// @ts-expect-error - It doesn't like that args is dynamic length
return originalWrite.call(res, chunk, ...args);
};

transports.set(transport.sessionId, transport);

res.on("close", () => {
console.log("Transport closed", transport.sessionId);
transports.delete(transport.sessionId);
});

server.connect(transport);

const originalOnMessage = transport.onmessage;
transport.onmessage = (message) => {
console.log("/sse message: ", message);
originalOnMessage?.(message);
};
});
cedrazgabriel
cedrazgabriel commented 3 days ago
cedrazgabriel
3 days ago
Author
Thanks man, I'm really going to test and debug to find out what might be happening, and as soon as I find out, I'll post the resolution here

