const test = require('node:test');
const assert = require('node:assert/strict');

const { isValidPassword } = require('../server');

test('password validation accepts the configured password and rejects others', () => {
  process.env.BOT_PASSWORD = 'admin123';
  assert.equal(isValidPassword('admin123'), true);
  assert.equal(isValidPassword('wrongpass'), false);
});
