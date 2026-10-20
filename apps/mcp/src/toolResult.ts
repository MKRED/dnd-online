import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DndApiError } from './apiClient.js';

export const text = (value: string): CallToolResult => ({
  content: [{ type: 'text', text: value }],
});
export const json = (value: unknown) => text(JSON.stringify(value, null, 2));

// Ошибки API возвращаются модели как результат с isError, а не исключением:
// так она видит сообщение сервера («Операция №2: Неизвестный блок…») и может исправиться.
export async function guarded(
  run: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof DndApiError)
      return { ...text(err.message), isError: true };
    console.error('MCP tool failed', err);
    throw err;
  }
}

export type Guarded = typeof guarded;
