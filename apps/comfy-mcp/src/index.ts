#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readConfig } from './config.js';
import { loadEnvFile } from './envFile.js';
import { createComfyMcpServer } from './server.js';

loadEnvFile();

// stdio-транспорт: stdout занят протоколом, поэтому любые логи — только в stderr.
const config = readConfig();
const server = createComfyMcpServer(config);

server
  .connect(new StdioServerTransport())
  .then(() =>
    console.error(
      `comfy MCP: ComfyUI ${config.url ?? 'не задан'}, вывод ${config.outputDir}`,
    ),
  )
  .catch((err: unknown) => {
    console.error('comfy MCP failed to start', err);
    process.exit(1);
  });
