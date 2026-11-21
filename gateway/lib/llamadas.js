const CircuitBreaker = require('opossum');
const { fetchT } = require('./http');

const breakers = new Map();

const obtenerBreaker = (nombre) => {
  if (!breakers.has(nombre)) {
    breakers.set(nombre, new CircuitBreaker(
      (url, options, timeoutMs, fetchImpl) => fetchT(url, options, timeoutMs, fetchImpl),
      {
        errorThresholdPercentage: 50,
        volumeThreshold: 5,
        resetTimeout: 10_000,
        timeout: 0,
      },
    ));
  }
  return breakers.get(nombre);
};

const llamar = (nombre, url, options, timeoutMs, fetchImpl) =>
  obtenerBreaker(nombre).fire(url, options, timeoutMs, fetchImpl);

module.exports = { llamar };
