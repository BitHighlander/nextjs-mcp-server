import { redirect } from 'next/navigation';

export default function Home() {
  // For browser requests, show info page
  if (typeof window !== 'undefined') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-bold mb-8">Next.js MCP Server</h1>
        <p className="mb-4">This is a Motion Control Protocol (MCP) server for integration with Cursor.</p>
        
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Endpoints:</h2>
          <ul className="list-disc list-inside">
            <li><strong>SSE Connection:</strong> <a href="/api/sse" className="text-blue-500 hover:underline">/api/sse</a></li>
            <li><strong>Message Handler:</strong> /api/message</li>
            <li><strong>MCP API:</strong> <a href="/api/mcp" className="text-blue-500 hover:underline">/api/mcp</a></li>
            <li><strong>MCP Request Handler:</strong> /api/mcp/request</li>
          </ul>
        </div>
        
        <p className="mb-4">To connect this MCP server to Cursor:</p>
        <ol className="list-decimal list-inside mb-8">
          <li>Make sure this server is running</li>
          <li>In Cursor, go to Settings &gt; Tools &gt; Motion Control Protocol</li>
          <li>Add a new MCP server with URL: <code className="bg-gray-200 p-1 rounded">http://localhost:3000</code></li>
        </ol>
        
        <p className="text-sm text-gray-500">See README.md for more details</p>
      </main>
    );
  }
  
  // For Cursor or other MCP clients, redirect to SSE endpoint
  redirect('/api/sse');
}
