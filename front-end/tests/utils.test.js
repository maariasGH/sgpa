import { jest } from "@jest/globals";
import { abrevSala, esFechaValida, fmtFecha, fmtFechaHora, formatearCuij, hhmm, hoy, nombreAutoridad, sumarDias } from "../src/utils.js";

describe("formatearCuij", () => {
  test.each([
    ["21", "21"],
    ["211", "21-1"],
    ["2112345678", "21-12345678"],
    ["21123456781", "21-12345678-1"],
  ])("aplica los guiones mientras se escribe: %s → %s", (entrada, esperado) => {
    expect(formatearCuij(entrada)).toBe(esperado);
  });

  test("descarta lo que no es dígito y corta en 11 dígitos", () => {
    expect(formatearCuij("21-1234ab5678-19999")).toBe("21-12345678-1");
  });
});

describe("sumarDias", () => {
  test("cruza meses y años", () => {
    expect(sumarDias("2026-01-31", 1)).toBe("2026-02-01");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  test("respeta los años bisiestos", () => {
    expect(sumarDias("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("hoy", () => {
  afterEach(() => jest.useRealTimers());

  test("usa la hora argentina y no la UTC", () => {
    // 02:00 UTC del 26 son las 23:00 del 25 en Argentina (UTC-3)
    jest.useFakeTimers({ now: new Date("2026-09-26T02:00:00Z") });
    expect(hoy()).toBe("2026-09-25");
  });
});

describe("esFechaValida", () => {
  test.each(["2026-09-25", "2028-02-29"])("acepta %s", (f) => expect(esFechaValida(f)).toBe(true));
  test.each(["2026-02-30", "2026-13-01", "25/09/2026", "", null, undefined])("rechaza %p", (f) => {
    expect(esFechaValida(f)).toBe(false);
  });
});

describe("formatos", () => {
  test("fmtFecha pasa a dd/mm/aaaa", () => {
    expect(fmtFecha("2026-08-20")).toBe("20/08/2026");
    expect(fmtFecha(null)).toBe("–");
  });

  test("hhmm recorta los segundos", () => {
    expect(hhmm("09:30:00")).toBe("09:30");
    expect(hhmm(undefined)).toBe("–");
  });

  test("fmtFechaHora convierte a hora argentina", () => {
    expect(fmtFechaHora("2026-08-20T10:15:00.000Z")).toBe("20/08/2026 07:15:00");
  });

  test("nombreAutoridad", () => {
    expect(nombreAutoridad({ apellido: "Méndez", nombre: "Roberto" })).toBe("Méndez, Roberto");
    expect(nombreAutoridad(null)).toBe("–");
  });
});

describe("abrevSala", () => {
  test.each([
    ["Sala 1 – Penal SF", "1"],
    ["Sala 12", "12"],
    ["Multipropósito – Rosario", "M.P."],
    ["Gesell", "Gesell"],
    [null, "–"],
  ])("%p → %p", (nombre, esperado) => expect(abrevSala(nombre)).toBe(esperado));
});
