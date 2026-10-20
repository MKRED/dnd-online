import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Fetch } from '../comfyClient.js';
import type { ComfyConfig } from '../config.js';
import { createComfyMcpServer } from '../server.js';

// Клиент MCP для тестов: сервер с подменённым fetch в той же памяти, без stdio. Пауза
// между опросами истории — мгновенная.
export async function connect(config: ComfyConfig, fetchFn: Fetch) {
  const server = createComfyMcpServer(config, fetchFn, {
    sleep: () => Promise.resolve(),
    now: () => new Date('2026-10-20T12:00:00Z'),
  });
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
  return (await client.callTool({ name, arguments: args })) as CallToolResult;
}

export const textOf = (result: CallToolResult) => {
  const first = result.content[0];
  return first?.type === 'text' ? first.text : '';
};
