const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

let poolPromise;

function getConfig() {
  return {
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeout: Number(process.env.DB_CONNECTION_TIMEOUT || 60000),
    requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT || 60000),
    options: {
      encrypt: (process.env.DB_ENCRYPT || 'true') === 'true',
      trustServerCertificate: (process.env.DB_TRUST_SERVER_CERTIFICATE || 'false') === 'true'
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };
}

function validateConfig(config) {
  const missing = ['server', 'database', 'user', 'password'].filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing database configuration: ${missing.join(', ')}`);
  }
}

async function getPool() {
  if (!poolPromise) {
    const config = getConfig();
    validateConfig(config);
    poolPromise = sql.connect(config);
  }

  return poolPromise;
}

function replaceParameters(queryText) {
  return queryText.replace(/\$(\d+)/g, (_, index) => `@p${index}`);
}

function applyReturningClause(queryText) {
  const returningMatch = queryText.match(/\s+RETURNING\s+([\s\S]+?)\s*;?\s*$/i);
  if (!returningMatch) {
    return queryText;
  }

  const columns = returningMatch[1]
    .split(',')
    .map((column) => column.trim())
    .filter(Boolean);

  const outputClause = ` OUTPUT ${columns.map((column) => `INSERTED.${column}`).join(', ')}`;
  const withoutReturning = queryText.replace(/\s+RETURNING\s+[\s\S]+?\s*;?\s*$/i, '');

  if (/^\s*INSERT\b/i.test(withoutReturning)) {
    return withoutReturning.replace(/\bVALUES\b/i, `${outputClause} VALUES`);
  }

  if (/^\s*UPDATE\b/i.test(withoutReturning)) {
    return withoutReturning.replace(/\bWHERE\b/i, `${outputClause} WHERE`);
  }

  return withoutReturning;
}

function translateQuery(queryText) {
  return applyReturningClause(replaceParameters(queryText));
}

module.exports = {
  query: async (text, params = []) => {
    const pool = await getPool();
    const request = pool.request();

    params.forEach((value, index) => {
      request.input(`p${index + 1}`, value);
    });

    const result = await request.query(translateQuery(text));
    return { rows: result.recordset || [] };
  },
  sql
};
