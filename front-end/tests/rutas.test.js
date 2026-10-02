import { jest } from "@jest/globals";
import { createElement as h } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AuthContext } from "../src/context/AuthContext.js";
import App from "../src/App.jsx";

// Respuestas vacías del gateway según la ruta pedida
const respuesta = (url) => {
  const { pathname } = new URL(url);
  if (pathname.endsWith("/distritos")) return [{ id_distrito: 1, nombre: "Santa Fe" }];
  if (pathname.endsWith("/salas")) return [];
  if (pathname.endsWith("/audiencias/stats")) {
    return { data: { total: 0, activas: 0, por_estado: [], por_tipo: [], por_sala_activas: [], por_juez: [], por_operador: [], por_hora: [], por_distrito: [] } };
  }
  return { data: [], total: 0, page: 1, totalPages: 0 };
};

beforeEach(() => {
  global.fetch = jest.fn(async (url) => ({ ok: true, status: 200, json: async () => respuesta(url) }));
});

const ADMIN    = { id_usuario: 1, nombre: "Admin", rol: "ADMINISTRADOR", id_distrito: null };
const OPERADOR = { id_usuario: 2, nombre: "Operador SF", rol: "OPERADOR", id_distrito: 1 };

const abrir = (ruta, usuario = null) => render(
  h(AuthContext.Provider, {
    value: { usuario, esAdmin: usuario?.rol === "ADMINISTRADOR", iniciarSesion: jest.fn(), cerrarSesion: jest.fn() },
  }, h(MemoryRouter, { initialEntries: [ruta] }, h(App))),
);

describe("rutas públicas", () => {
  test("/ muestra el calendario público", async () => {
    abrir("/");
    expect(await screen.findByRole("heading", { name: "Calendario de Audiencias" })).toBeTruthy();
  });

  test("una ruta inexistente vuelve al calendario", async () => {
    abrir("/no-existe");
    expect(await screen.findByRole("heading", { name: "Calendario de Audiencias" })).toBeTruthy();
  });
});

describe("rutas del panel", () => {
  test("sin sesión, /panel manda al login", async () => {
    abrir("/panel/autoridades");
    expect(await screen.findByRole("heading", { name: "Acceso interno" })).toBeTruthy();
  });

  test("con sesión, /login manda al panel", async () => {
    abrir("/login", OPERADOR);
    expect(await screen.findByRole("heading", { name: "Gestión de audiencias" })).toBeTruthy();
  });

  test("cada pestaña tiene su propia URL", async () => {
    abrir("/panel/autoridades", OPERADOR);
    expect(await screen.findByRole("heading", { name: "Gestión de autoridades" })).toBeTruthy();
  });

  test("la navegación entre pestañas funciona desde cualquier pestaña", async () => {
    abrir("/panel/audiencias", OPERADOR);
    fireEvent.click(await screen.findByRole("link", { name: /Autoridades/ }));
    expect(await screen.findByRole("heading", { name: "Gestión de autoridades" })).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: /Estadísticas/ }));
    expect(await screen.findByRole("heading", { name: /Estadísticas/ })).toBeTruthy();
  });

  test("el administrador puede entrar a Operadores", async () => {
    abrir("/panel/operadores", ADMIN);
    expect(await screen.findByRole("heading", { name: "Operadores" })).toBeTruthy();
  });

  test("el operador no ve Auditoría: vuelve a Audiencias", async () => {
    abrir("/panel/auditoria", OPERADOR);
    expect(await screen.findByRole("heading", { name: "Gestión de audiencias" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Auditoría/ })).toBeNull();
  });

  test("estadísticas se piden agregadas al backend", async () => {
    abrir("/panel/estadisticas", ADMIN);
    await screen.findByText("Sin datos para el período seleccionado");
    const urls = global.fetch.mock.calls.map(([url]) => url);
    expect(urls.some(u => u.includes("/api/audiencias/stats"))).toBe(true);
    expect(urls.some(u => /\/api\/audiencias\?/.test(u))).toBe(false);
  });
});
