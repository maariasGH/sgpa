const v = require('../lib/validaciones');
const { rangoPredefinido, sumarDias } = require('../lib/fechas');

describe('CUIJ', () => {
  test('aplica los guiones a 11 dígitos', () => {
    expect(v.normalizarCuij('21123456781')).toBe('21-12345678-1');
  });

  test('acepta el formato con guiones', () => {
    expect(v.esCuijValido(v.normalizarCuij('21-12345678-1'))).toBe(true);
  });

  test.each(['2112345678', '21-1234567-81', 'AB-12345678-1', '', null])('rechaza %p', (cuij) => {
    expect(v.esCuijValido(v.normalizarCuij(cuij))).toBe(false);
  });
});

describe('validarHorario', () => {
  test('acepta un rango dentro de 07:00 - 19:00', () => {
    expect(v.validarHorario('09:00', '10:30')).toBeNull();
    expect(v.validarHorario('07:00', '19:00')).toBeNull();
  });

  test('rechaza inicio antes de las 07:00', () => {
    expect(v.validarHorario('06:59', '08:00')).toMatch(/hora_inicio/);
  });

  test('rechaza fin posterior a las 19:00', () => {
    expect(v.validarHorario('18:00', '19:01')).toMatch(/hora_fin no puede superar/);
  });

  test('rechaza fin menor o igual al inicio', () => {
    expect(v.validarHorario('10:00', '10:00')).toMatch(/mayor que hora_inicio/);
    expect(v.validarHorario('10:00', '09:00')).toMatch(/mayor que hora_inicio/);
  });

  test('rechaza formatos inválidos', () => {
    expect(v.validarHorario('9:00', '10:00')).toMatch(/formato/);
    expect(v.validarHorario('09:00', '25:00')).toMatch(/formato/);
  });

  test('acepta horas con segundos', () => {
    expect(v.validarHorario('09:00:00', '10:00:00')).toBeNull();
  });
});

describe('seSolapan', () => {
  const a = { hora_inicio: '09:00', hora_fin: '10:00' };

  test('detecta solapamiento parcial', () => {
    expect(v.seSolapan(a, { hora_inicio: '09:30', hora_fin: '10:30' })).toBe(true);
    expect(v.seSolapan(a, { hora_inicio: '08:30', hora_fin: '09:01' })).toBe(true);
  });

  test('detecta un intervalo contenido en otro', () => {
    expect(v.seSolapan(a, { hora_inicio: '09:15', hora_fin: '09:45' })).toBe(true);
    expect(v.seSolapan({ hora_inicio: '09:15', hora_fin: '09:45' }, a)).toBe(true);
  });

  test('intervalos contiguos NO se solapan', () => {
    expect(v.seSolapan(a, { hora_inicio: '10:00', hora_fin: '11:00' })).toBe(false);
    expect(v.seSolapan(a, { hora_inicio: '08:00', hora_fin: '09:00' })).toBe(false);
  });

  test('intervalos disjuntos NO se solapan', () => {
    expect(v.seSolapan(a, { hora_inicio: '14:00', hora_fin: '15:00' })).toBe(false);
  });

  test('mezcla formatos HH:MM y HH:MM:SS', () => {
    expect(v.seSolapan(a, { hora_inicio: '09:59:00', hora_fin: '11:00:00' })).toBe(true);
  });
});

describe('fechas', () => {
  test('esFechaValida', () => {
    expect(v.esFechaValida('2027-02-28')).toBe(true);
    expect(v.esFechaValida('2027-02-30')).toBe(false);
    expect(v.esFechaValida('27-02-2027')).toBe(false);
  });

  test('sumarDias cruza meses y años', () => {
    expect(sumarDias('2027-01-31', 1)).toBe('2027-02-01');
    expect(sumarDias('2027-01-01', -1)).toBe('2026-12-31');
  });

  test('rango mes', () => {
    expect(rangoPredefinido('mes', '2028-02-10')).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' });
  });

  test('rango semana (lunes a domingo)', () => {
    // 2027-03-17 es miércoles
    expect(rangoPredefinido('semana', '2027-03-17')).toEqual({ desde: '2027-03-15', hasta: '2027-03-21' });
  });

  test('rango anio', () => {
    expect(rangoPredefinido('anio', '2027-06-01')).toEqual({ desde: '2027-01-01', hasta: '2027-12-31' });
  });
});
