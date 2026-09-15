import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const compose = ['compose', '-f', resolve(root, 'api/compose.local.yml')];
const action = process.argv[2] || 'start';
if (!['start', 'stop', 'status', 'logs', 'verify-restart', 'build-extension'].includes(action)) {
  throw new Error('Usage: node scripts/local-dev.mjs [start|stop|status|logs|verify-restart|build-extension]');
}

async function run(command, args, cwd = root) {
  await new Promise((success, failure) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', shell: false });
    child.once('error', failure);
    child.once('exit', (code, signal) => {
      if (code === 0) success();
      else failure(new Error(`${command} ${args[0]} failed (${signal || code}); see output above.`));
    });
  });
}

async function waitFor(url, timeoutMs = 180000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      await response.body?.cancel();
      if (response.ok) return;
    } catch { /* Services can still be starting or compiling. */ }
    await delay(1000);
  }
  throw new Error(`${url} did not become ready. Run node scripts/local-dev.mjs logs.`);
}

async function waitForProduct() {
  await Promise.all([
    waitFor('http://localhost:18080/health'),
    waitFor('http://localhost:18081/health'),
    waitFor('http://localhost:3000/login'),
  ]);
}

async function verifyStorage(mode, id) {
  const args = ['run', '--rm', '--network', 'fable-local_local',
    '--mount', `type=bind,source=${resolve(root, 'jobs/scripts')},target=/usr/sqs_jobs/scripts,readonly`,
    '-e', 'LOCAL_STORAGE_TEST_ENDPOINT=http://storage:8333', '--entrypoint', 'node', 'fable-local-jobs:phase0'];
  await run('docker', [...args, 'scripts/verify-local-storage.js', mode]);
  await run('docker', [...args, 'scripts/verify-local-queue-restart.js', mode, id]);
}

async function buildExtension() {
  const workspace = resolve(root, 'app/workspace');
  const output = resolve(workspace, 'packages/ext-tour/build/pinned');
  await run('docker', ['build', '--file', 'Dockerfile.local', '--target', 'extension',
    '--tag', 'fable-local-extension:phase0', '.'], workspace);
  await mkdir(output, { recursive: true });
  const artifact = `fable-extension-artifact-${randomUUID()}`;
  await run('docker', ['create', '--name', artifact, 'fable-local-extension:phase0']);
  try {
    await run('docker', ['cp', `${artifact}:/workspace/packages/ext-tour/build/.`, output]);
  } finally { await run('docker', ['rm', artifact]); }
  console.log(`Pinned local extension is ready at ${output}.`);
}

try {
  if (action === 'build-extension') await buildExtension();
  else if (action === 'stop') {
    await run('docker', [...compose, 'stop']);
    console.log('Local Fable stopped. Its volumes and recordings are retained.');
  } else if (action === 'verify-restart') {
    await waitForProduct();
    const id = randomUUID();
    await verifyStorage('write', id);
    await run('docker', [...compose, 'stop']);
    await run('docker', [...compose, 'up', '-d']);
    await waitForProduct();
    await verifyStorage('read', id);
    console.log('Local restart preserves object data, access policy, queued work and acknowledgements.');
  } else if (action === 'status') await run('docker', [...compose, 'ps', '-a']);
  else if (action === 'logs') await run('docker', [...compose, 'logs', '--tail', '100']);
  else {
    await run('docker', ['info', '--format', '{{.ServerVersion}}']);
    // Replacing a mounted JAR while Java is running can corrupt lazy class reads.
    await run('docker', [...compose, 'stop', 'jobs', 'api']);
    console.log('Verifying the API using pinned Maven and Java 17.');
    await run('docker', ['run', '--rm',
      '--mount', `type=bind,source=${resolve(root, 'api')},target=/workspace`,
      '--mount', 'type=volume,source=fable-phase0-maven,target=/root/.m2',
      '-w', '/workspace',
      'maven:3.8.6-eclipse-temurin-17@sha256:5092873778f0495464c1151df8f5c2e01a09ba37d931be719cbc1fc0f4559a07',
      'bash', './mvnw', '--batch-mode', '--no-transfer-progress', 'verify']);
    await run(process.execPath, [resolve(root, 'scripts/sync-api-contracts.mjs'), '--check']);
    console.log('Building the pinned client and FFmpeg worker. No provider credentials are required.');
    await run('docker', [...compose, 'build', 'client', 'jobs', 'queue']);
    await buildExtension();
    await run('docker', [...compose, 'up', '-d']);
    // Mounted configuration changes do not reload an already-running nginx process.
    await run('docker', [...compose, 'restart', 'gateway']);
    await waitForProduct();
    console.log('Local Fable is ready at http://localhost:3000/login. Select Continue to Fable for your manual workspace.');
  }
} catch (error) {
  console.error(error.message);
  console.error('Startup stops on failed checks. Existing development volumes are retained.');
  process.exitCode = 1;
}
