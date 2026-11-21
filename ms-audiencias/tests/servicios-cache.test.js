const sala = { id_sala: 3, nombre: 'Sala de prueba', tipo: 'PENAL', id_distrito: 1 };
const autoridad = { id_autoridad: 4, nombre: 'Ana', apellido: 'Prueba', cargo: 'JUEZ' };

describe('caché de datos para enriquecer audiencias', () => {
  const fetchOriginal = global.fetch;
  let ahora;

  beforeEach(() => {
    jest.resetModules();
    ahora = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => ahora);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = fetchOriginal;
    jest.restoreAllMocks();
  });

  test('conserva el último catálogo de salas si el servicio cae tras vencer el TTL', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [sala] })
      .mockRejectedValueOnce(new Error('ms-salas no responde'));
    const { obtenerSalasCacheadas } = require('../lib/servicios');

    expect(await obtenerSalasCacheadas()).toEqual([sala]);
    ahora += 61_000;
    expect(await obtenerSalasCacheadas()).toEqual([sala]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('conserva las autoridades cacheadas ante una caída del servicio', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [autoridad] }) })
      .mockRejectedValueOnce(new Error('ms-autoridades no responde'));
    const { obtenerAutoridadesCacheadas } = require('../lib/servicios');

    expect(await obtenerAutoridadesCacheadas([4])).toEqual([autoridad]);
    ahora += 61_000;
    expect(await obtenerAutoridadesCacheadas([4])).toEqual([autoridad]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
