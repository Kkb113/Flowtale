/* Run inside the isolated fable-local Compose network; fixture credentials only. */
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const { readFileSync } = require('node:fs');

async function verify() {
  const api = mysql.createPool({
    host: 'db', user: 'root', password: 'fable-local-mysql', database: 'fable_tour_app',
    connectionLimit: 2, connectTimeout: 10000,
  });
  const analytics = new Pool({
    host: 'pg_analytics', user: 'fable', password: 'fable-local-postgres', database: 'fable_analytics',
    connectionTimeoutMillis: 10000,
  });
  try {
    await assert.rejects(mysql.createConnection({
      host: 'db', user: 'root', password: 'fable-local-mysql', connectTimeout: 10000,
      ssl: { rejectUnauthorized: true, verifyIdentity: true, minVersion: 'TLSv1.2' },
    }), /self.signed|certificate/i);
    // The default MySQL server certificate is signed by this CA, but does not name "db".
    const ca = readFileSync('/mysql-ca.pem', 'utf8');
    await assert.rejects(mysql.createConnection({
      host: 'db', user: 'root', password: 'fable-local-mysql', connectTimeout: 10000,
      ssl: { ca, rejectUnauthorized: true, verifyIdentity: true, minVersion: 'TLSv1.2' },
    }), /Hostname\/IP does not match certificate/);
    const [migrations] = await api.query('SELECT COUNT(*) AS count FROM migration.flyway_schema_history WHERE success = 1 AND type = ?', ['SQL']);
    assert.equal(migrations[0].count, 45);
    const pgMigrations = await analytics.query('SELECT COUNT(*)::integer AS count FROM migration.flyway_schema_history WHERE success = true AND type = $1', ['SQL']);
    assert.equal(pgMigrations.rows[0].count, 17);
    const first = await api.getConnection();
    const second = await api.getConnection();
    try {
      const [[claim]] = await first.query('SELECT GET_LOCK(?, 0) AS acquired', ['fable-local-verify']);
      assert.equal(claim.acquired, 1);
      const [[duplicate]] = await second.query('SELECT GET_LOCK(?, 0) AS acquired', ['fable-local-verify']);
      assert.equal(duplicate.acquired, 0);
      await first.query('SELECT RELEASE_LOCK(?)', ['fable-local-verify']);
      const [[next]] = await second.query('SELECT GET_LOCK(?, 0) AS acquired', ['fable-local-verify']);
      assert.equal(next.acquired, 1);
      await second.query('SELECT RELEASE_LOCK(?)', ['fable-local-verify']);
      await first.beginTransaction();
      await first.query('INSERT INTO settings (k, v) VALUES (?, ?)', ['LOCAL_VERIFY_ROLLBACK', 'not committed']);
      await first.rollback();
      const [rows] = await second.query('SELECT k FROM settings WHERE k = ?', ['LOCAL_VERIFY_ROLLBACK']);
      assert.equal(rows.length, 0);
    } finally {
      first.release();
      second.release();
    }
    console.log('Local migrations, query/lock behavior, untrusted CA and wrong-host TLS rejection verified.');
  } finally {
    await Promise.all([api.end(), analytics.end()]);
  }
}

verify().catch(error => { console.error(error.message); process.exitCode = 1; });
