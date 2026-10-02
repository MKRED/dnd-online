#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createApiCall } from './apiClient.js';
import { readConfig } from './config.js';
import { loadEnvFile } from './envFile.js';
import { createMapMcpServer } from './server.js';

loadEnvFile();

// stdio-транспорт: stdout занят протоколом, поэтому любые логи — только в stderr.
const config = readConfig();
const server = createMapMcpServer(createApiCall(config), config.webUrl);

server
  .connect(new StdioServerTransport())
  .then(() =>
    console.error(`dnd-map MCP: API ${config.apiUrl}, web ${config.webUrl}`),
  )
  .catch((err: unknown) => {
    console.error('dnd-map MCP failed to start', err);
    process.exit(1);
  });
