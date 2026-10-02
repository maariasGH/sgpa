import { jest } from "@jest/globals";
import { activable } from "../src/a11y.js";

const evento = (key, mismoElemento = true) => {
  const el = {};
  return { key, target: mismoElemento ? el : {}, currentTarget: el, preventDefault: jest.fn() };
};

describe("activable", () => {
  test("hace la fila enfocable", () => {
    expect(activable(() => {}).tabIndex).toBe(0);
  });

  test.each(["Enter", " "])("la tecla %p ejecuta la acción", (tecla) => {
    const accion = jest.fn();
    const e = evento(tecla);
    activable(accion).onKeyDown(e);
    expect(accion).toHaveBeenCalled();
    expect(e.preventDefault).toHaveBeenCalled();
  });

  test("ignora otras teclas", () => {
    const accion = jest.fn();
    activable(accion).onKeyDown(evento("a"));
    expect(accion).not.toHaveBeenCalled();
  });

  test("ignora las teclas que vienen de un botón interno", () => {
    const accion = jest.fn();
    activable(accion).onKeyDown(evento("Enter", false));
    expect(accion).not.toHaveBeenCalled();
  });
});
