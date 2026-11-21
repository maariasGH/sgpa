const fetch = require('node-fetch');

const fetchT = (url, options = {}, timeoutMs = 3000, fetchImpl = fetch) =>
  fetchImpl(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });

module.exports = { fetchT };
