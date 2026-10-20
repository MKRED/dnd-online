import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ApiCall } from '../apiClient.js';
import { createDndMcpServer } from '../server.js';

// Клиент MCP для тестов: сервер с подменённым API в той же памяти, без stdio.
export async function connect(api: ApiCall) {
  const server = createDndMcpServer(api, 'http://web.test');
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0' });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
}

export async function call(
  client: Client,
  name: string,
  args: Record<string, unknown> = {},
) {
  const result = (await client.callTool({
    name,
    arguments: args,
  })) as CallToolResult;
  const first = result.content[0];
  return {
    isError: result.isError ?? false,
    text: first?.type === 'text' ? first.text : '',
  };
}
