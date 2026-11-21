const fetchT = (url, options = {}, timeoutMs = 3000) =>
  fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });

module.exports = { fetchT };
