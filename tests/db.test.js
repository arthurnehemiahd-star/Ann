const test = require('node:test');
const assert = require('node:assert/strict');

test('MemoryDB uses Postgres when DATABASE_URL is configured', () => {
  process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/ann';
  const { MemoryDB } = require('../src/db');
  const db = new MemoryDB();

  assert.equal(db.provider, 'postgres');
  db.close();
});
