import { databaseTls } from './database-security';

it('requires certificate verification for production and unspecified environments', () => {
  expect(databaseTls('database.example.com', 'DB_SSL_CA_FILE', {}))
    .toEqual({ rejectUnauthorized: true, minVersion: 'TLSv1.2' });
  expect(databaseTls('localhost', 'ANALYTICS_DB_SSL_CA_FILE', { APP_ENV: 'prod' }))
    .toEqual({ rejectUnauthorized: true, minVersion: 'TLSv1.2' });
});

it.each(['prod', 'staging', 'dev', undefined])('rejects a local override in %s', APP_ENV => {
  expect(() => databaseTls('localhost', 'DB_SSL_CA_FILE', { APP_ENV, LOCAL_DEVELOPMENT: 'true' })).toThrow();
});

it('rejects the production Node runtime even with a local profile', () => {
  expect(() => databaseTls('localhost', 'DB_SSL_CA_FILE', {
    APP_ENV: 'local', LOCAL_DEVELOPMENT: 'true', NODE_ENV: 'production',
  })).toThrow();
});

it.each(['localhost', '127.0.0.1', '::1', 'db', 'pg_analytics'])('allows the explicit local fixture at %s', host => {
  expect(databaseTls(host, 'DB_SSL_CA_FILE', { APP_ENV: 'local', LOCAL_DEVELOPMENT: 'true' })).toBeUndefined();
});

it('rejects remote hosts in local plaintext mode', () => {
  expect(() => databaseTls('database.example.com', 'DB_SSL_CA_FILE', {
    APP_ENV: 'local', LOCAL_DEVELOPMENT: 'true',
  })).toThrow();
});

it('does not disable TLS merely because the profile says local', () => {
  expect(databaseTls('db', 'DB_SSL_CA_FILE', { APP_ENV: 'local' })?.rejectUnauthorized).toBe(true);
});

it.each(['127.0.0.1', '10.0.0.1', '::1', '[::1]'])('requires a verified DNS hostname instead of %s', host => {
  expect(() => databaseTls(host, 'DB_SSL_CA_FILE', { APP_ENV: 'prod' })).toThrow(/DNS hostname/);
});

it('fails closed when a configured CA cannot be read', () => {
  expect(() => databaseTls('database.example.com', 'DB_SSL_CA_FILE', {
    DB_SSL_CA_FILE: '/nonexistent/fable-test-ca.pem',
  })).toThrow();
});
