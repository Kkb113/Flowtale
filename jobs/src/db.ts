import { createPool } from 'mysql2/promise';
import {CONCURRENCY} from './consts';
import { Pool }  from 'pg';
import {ConnectionString} from 'connection-string';
import { databaseTls } from './database-security';

const csApi = new ConnectionString(process.env.DB_CONN_URL);
export const apiConnectionPool  = createPool({
  // Media jobs hold one advisory-lock connection; reserve capacity for HTTP and nested analytics queries.
  connectionLimit : CONCURRENCY + 4,
  host : csApi.hostname,
  user : process.env.DB_USER,
  password : process.env.DB_PWD,
  database : process.env.DB_DB,
  port : csApi.port,
  ssl: (() => {
    const tls = databaseTls(csApi.hostname, 'DB_SSL_CA_FILE');
    return tls ? { ...tls, verifyIdentity: true } : undefined;
  })(),
  connectTimeout: 10000,
});

export const getApiConnection = () => apiConnectionPool.getConnection();


const csAnalytics = new ConnectionString(process.env.ANALYTICS_DB_CONN_URL);
export const clientAnalytics = new Pool({
  host: csAnalytics.hostname,
  database: process.env.ANALYTICS_DB_NAME,
  user: process.env.ANALYTICS_DB_USER,
  password: process.env.ANALYTICS_DB_PWD,
  port: csAnalytics.port,
  max: CONCURRENCY,
  ssl: databaseTls(csAnalytics.hostname, 'ANALYTICS_DB_SSL_CA_FILE') ?? false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});
