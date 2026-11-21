process.env.INTERNAL_API_KEY = 'test-internal-key-with-at-least-32-characters';

const { firmarUrlVideo, validarFirmaVideo } = require('../lib/videos');

describe('firmas de URL de video', () => {
  afterEach(() => jest.restoreAllMocks());

  test('acepta una firma vigente vinculada a la audiencia', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    const { exp, sig } = firmarUrlVideo(42);

    expect(validarFirmaVideo('42', String(exp), sig)).toBe(true);
    expect(validarFirmaVideo('43', String(exp), sig)).toBe(false);
  });

  test('rechaza firmas vencidas o mal formadas', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    const { exp, sig } = firmarUrlVideo(42);

    Date.now.mockReturnValue((exp + 1) * 1000);
    expect(validarFirmaVideo('42', String(exp), sig)).toBe(false);
    expect(validarFirmaVideo('42', '1e10', sig)).toBe(false);
    expect(validarFirmaVideo('42', String(exp), 'invalid')).toBe(false);
  });

  test('las firmas públicas tienen un alcance distinto al de las firmas privadas', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    const { exp, sig } = firmarUrlVideo(42, 'public');

    expect(validarFirmaVideo('42', String(exp), sig, 'public')).toBe(true);
    expect(validarFirmaVideo('42', String(exp), sig)).toBe(false);
  });
});
