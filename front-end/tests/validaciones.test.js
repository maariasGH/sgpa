import { aMinutos, validarAudiencia, validarAutoridad, validarHorario, validarOperador } from "../src/validaciones.js";

const audienciaValida = {
  cuij: "21-12345678-1", caratula: "Pérez s/ robo", tipo_audiencia: "Imputativa",
  id_sala: "1", fecha: "2026-09-25", hora_inicio: "09:00", hora_fin: "10:00",
  id_juez: "1", id_fiscal: "3",
};

describe("aMinutos", () => {
  test("convierte HH:MM a minutos del día", () => {
    expect(aMinutos("00:00")).toBe(0);
    expect(aMinutos("09:30")).toBe(570);
  });
});

describe("validarHorario (07:00 – 19:00)", () => {
  test("acepta los extremos del rango", () => {
    expect(validarHorario("07:00", "19:00")).toBeNull();
  });
  test("rechaza inicio antes de las 07:00", () => {
    expect(validarHorario("06:59", "08:00")).toMatch(/inicio/);
  });
  test("rechaza fin después de las 19:00", () => {
    expect(validarHorario("18:00", "19:01")).toMatch(/no puede superar/);
  });
  test("rechaza fin igual o anterior al inicio", () => {
    expect(validarHorario("10:00", "10:00")).toMatch(/posterior/);
    expect(validarHorario("10:00", "09:00")).toMatch(/posterior/);
  });
});

describe("validarAudiencia", () => {
  test("acepta un formulario completo y válido", () => {
    expect(validarAudiencia(audienciaValida)).toBeNull();
  });

  test("lista todos los campos que faltan", () => {
    const msg = validarAudiencia({ ...audienciaValida, cuij: "", id_juez: "", caratula: "   " });
    expect(msg).toBe("Completá: CUIJ, carátula, juez.");
  });

  test("rechaza un CUIJ incompleto", () => {
    expect(validarAudiencia({ ...audienciaValida, cuij: "21-1234567" })).toMatch(/CUIJ/);
  });

  test("aplica el rango horario", () => {
    expect(validarAudiencia({ ...audienciaValida, hora_fin: "20:00" })).toMatch(/19:00/);
  });
});

describe("validarAutoridad", () => {
  const ok = { nombre: "Laura", apellido: "Giménez", dni: "28441201", cargo: "JUEZ", email: "lg@justsf.gov.ar", id_distrito: "1" };
  test("acepta datos válidos", () => expect(validarAutoridad(ok)).toBeNull());
  test("exige los obligatorios", () => expect(validarAutoridad({ ...ok, email: "" })).toMatch(/obligatorios/));
  test("DNI solo numérico", () => expect(validarAutoridad({ ...ok, dni: "28.441.201" })).toMatch(/DNI/));
  test("email con formato", () => expect(validarAutoridad({ ...ok, email: "sin-arroba" })).toMatch(/email/));
});

describe("validarOperador", () => {
  const ok = { username: "op.sf", password: "clave1234", nombre: "Ana Díaz", dni: "30445678", email: "ad@justsf.gov.ar", id_distrito: "1" };
  test("al crear exige contraseña", () => {
    expect(validarOperador({ ...ok, password: "" }, true)).toMatch(/obligatorios/);
  });
  test("al editar la contraseña es opcional", () => {
    expect(validarOperador({ ...ok, password: "" }, false)).toBeNull();
  });
  test("contraseña de al menos 8 caracteres", () => {
    expect(validarOperador({ ...ok, password: "corta" }, true)).toMatch(/8 caracteres/);
  });
});
