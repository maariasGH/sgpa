const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const { fetchT } = require('../lib/http');

test('aborta una llamada interservicio que excede su timeout', async t => {
  const server = http.createServer(() => {});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  await assert.rejects(
    fetchT(`http://127.0.0.1:${server.address().port}/slow`, {}, 30),
    err => err.name === 'AbortError' || err.name === 'TimeoutError',
  );
});
