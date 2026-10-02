import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: [
    './src/database/schema/users.ts',
    './src/database/schema/refresh-tokens.ts',
    './src/database/schema/characters.ts',
    './src/database/schema/maps.ts',
    './src/database/schema/map-chunks.ts',
    './src/database/schema/map-ops.ts',
    './src/database/schema/api-tokens.ts',
  ],
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
