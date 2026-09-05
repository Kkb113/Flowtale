import { readFileSync } from 'fs';
import { isIP } from 'net';

type DatabaseTls = { rejectUnauthorized: true; ca?: string; minVersion: 'TLSv1.2' };

/** Plaintext is permitted only for the explicitly enabled, isolated local stack. */
export function databaseTls(
  hostname: string | undefined,
  caVariable: 'DB_SSL_CA_FILE' | 'ANALYTICS_DB_SSL_CA_FILE',
  env: NodeJS.ProcessEnv = process.env,
): DatabaseTls | undefined {
  if (!hostname) throw new Error('A database hostname is required');
  if (env.LOCAL_DEVELOPMENT === 'true') {
    if (env.APP_ENV !== 'local' || env.NODE_ENV === 'production') {
      throw new Error('Local database access cannot be enabled outside the local development profile');
    }
    if (!['localhost', '127.0.0.1', '::1', '[::1]', 'db', 'pg_analytics', 'pg-analytics'].includes(hostname)) {
      throw new Error('Local database access requires a loopback address or a local Compose database service');
    }
    return undefined;
  }
  if (isIP(hostname.replace(/^\[|\]$/g, ''))) {
    throw new Error('Use a database DNS hostname matching its TLS certificate outside local development');
  }
  const caPath = env[caVariable];
  return {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2',
    ...(caPath ? { ca: readFileSync(caPath, 'utf8') } : {}),
  };
}
