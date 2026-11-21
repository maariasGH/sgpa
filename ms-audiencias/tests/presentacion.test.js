const { publica } = require('../lib/presentacion');

describe('presentacion publica de audiencias', () => {
  const audiencia = {
    id_audiencia: 12,
    caratula: 'Caso de prueba',
    cuij: '21-12345678-1',
    id_usuario_carga: 7,
    motivo_cambio: 'Dato interno',
    reservada: false,
    video: 'audiencia-12.mp4',
    sala: { tipo: 'COMUN' },
  };

  test('conserva los datos publicados y excluye campos internos', () => {
    const resultado = publica(audiencia);

    expect(resultado.caratula).toBe(audiencia.caratula);
    expect(resultado.cuij).toBe(audiencia.cuij);
    expect(resultado.tiene_video).toBe(true);
    expect(resultado).not.toHaveProperty('id_usuario_carga');
    expect(resultado).not.toHaveProperty('motivo_cambio');
    expect(resultado).not.toHaveProperty('video');
    expect(resultado).not.toHaveProperty('reservada');
  });

  test.each([
    ['reservada', { reservada: true, sala: { tipo: 'COMUN' } }],
    ['sala GESELL', { reservada: false, sala: { tipo: 'GESELL' } }],
    ['sala no disponible', { reservada: false, sala: null }],
    ['sala Gesell en minúsculas', { reservada: false, sala: { tipo: 'gesell' } }],
  ])('oculta carátula y video para una causa %s', (_caso, cambios) => {
    const resultado = publica({ ...audiencia, ...cambios });

    expect(resultado.caratula).toBe('Causa reservada');
    expect(resultado.tiene_video).toBe(false);
  });
});
