import { jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useCarga } from "../src/hooks/useCarga.js";
import { useDebounce } from "../src/hooks/useDebounce.js";

// Promesa que se resuelve a mano, para controlar el orden de las respuestas
const diferida = () => {
  let resolver;
  const promesa = new Promise((res) => { resolver = res; });
  return { promesa, resolver };
};

describe("useCarga", () => {
  test("expone los datos cuando la carga termina", async () => {
    const { result } = renderHook(() => useCarga(() => Promise.resolve([1, 2]), [], []));
    expect(result.current.cargando).toBe(true);
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.datos).toEqual([1, 2]);
    expect(result.current.error).toBeNull();
  });

  test("expone el error y conserva los datos anteriores", async () => {
    const error = new Error("falló");
    const { result } = renderHook(() => useCarga(() => Promise.reject(error), [], "inicial"));
    await waitFor(() => expect(result.current.error).toBe(error));
    expect(result.current.datos).toBe("inicial");
  });

  test("ignora la respuesta vieja si las dependencias cambiaron", async () => {
    const lenta = diferida(), rapida = diferida();
    const cargas = { a: lenta.promesa, b: rapida.promesa };
    const { result, rerender } = renderHook(({ fecha }) => useCarga(() => cargas[fecha], [fecha]), {
      initialProps: { fecha: "a" },
    });

    rerender({ fecha: "b" });
    await act(async () => { rapida.resolver("datos de b"); });
    await act(async () => { lenta.resolver("datos de a"); });   // llega tarde

    expect(result.current.datos).toBe("datos de b");
  });

  test("recargar vuelve a ejecutar la carga", async () => {
    const cargar = jest.fn().mockResolvedValue("ok");
    const { result } = renderHook(() => useCarga(cargar, []));
    await waitFor(() => expect(cargar).toHaveBeenCalledTimes(1));
    act(() => result.current.recargar());
    await waitFor(() => expect(cargar).toHaveBeenCalledTimes(2));
  });
});

describe("useDebounce", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("solo entrega el último valor cuando se deja de escribir", () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), { initialProps: { v: "a" } });
    rerender({ v: "ab" });
    act(() => jest.advanceTimersByTime(200));
    rerender({ v: "abc" });
    act(() => jest.advanceTimersByTime(200));
    expect(result.current).toBe("a");          // todavía no pasaron 300 ms sin cambios
    act(() => jest.advanceTimersByTime(100));
    expect(result.current).toBe("abc");
  });
});
