import { readFile, writeFile } from 'node:fs/promises';

// Maven is the contract producer. Both TypeScript consumers use its exact, deterministic output.
const root = new URL('../', import.meta.url);
const source = (await readFile(new URL('api/gen/api-contract.d.ts', root), 'utf8')).replace(/\r\n/g, '\n');
if (!source.includes('export interface ApiResp') || !source.includes('export const enum ResponseStatus')) {
  throw new Error('The generated API contract is missing or invalid. Run the API build first.');
}
for (const target of ['app/workspace/packages/common/src/api-contract.ts', 'jobs/src/api-contract.ts']) {
  const file = new URL(target, root);
  if (process.argv.includes('--check')) {
    if ((await readFile(file, 'utf8')).replace(/\r\n/g, '\n') !== source) {
      throw new Error(`${target} is stale. Run node scripts/sync-api-contracts.mjs after building the API.`);
    }
  } else {
    await writeFile(file, source);
  }
}
