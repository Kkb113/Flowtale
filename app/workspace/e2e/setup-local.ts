import { request } from '@playwright/test';

export default async function setupLocal(): Promise<void> {
  const client = await request.newContext({ timeout: 5000 });
  try {
    await Promise.all(['http://localhost:3000/login', 'http://localhost:18080/health',
      'http://localhost:18081/health'].map(async url => {
      const deadline = Date.now() + 180000;
      while (Date.now() < deadline) {
        try {
          const response = await client.get(url);
          const ready = response.ok();
          await response.dispose();
          if (ready) return;
        } catch { /* Compilation and dependent services may still be starting. */ }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      throw new Error(`${url} is unavailable. Start the local stack with node scripts/local-dev.mjs start.`);
    }));
  } finally { await client.dispose(); }
}
