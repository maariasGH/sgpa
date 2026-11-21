import { jest } from "@jest/globals";
import { act, createElement as h, useContext } from "react";
import { render } from "@testing-library/react";
import { AuthContext } from "../src/context/AuthContext.js";
import { AuthProvider } from "../src/context/AuthProvider.jsx";
import { api, setToken } from "../src/api/client.js";

test("limpia el token local antes de que cargue la vista pública", async () => {
  const token = "token-de-prueba";
  let resolverLogout;
  let cerrarSesion;
  global.fetch = jest.fn((url) => {
    if (String(url).endsWith("/auth/logout")) {
      return new Promise(resolve => { resolverLogout = resolve; });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    });
  });
  setToken(token);

  function CapturarCerrarSesion() {
    cerrarSesion = useContext(AuthContext).cerrarSesion;
    return null;
  }

  render(h(AuthProvider, null, h(CapturarCerrarSesion)));

  let cierre;
  act(() => { cierre = cerrarSesion(); });
  await api.get("/audiencias");

  const solicitudLogout = global.fetch.mock.calls.find(([url]) => String(url).endsWith("/auth/logout"));
  const solicitudPublica = global.fetch.mock.calls.find(([url]) => String(url).endsWith("/api/audiencias"));
  expect(solicitudLogout[1].headers.Authorization).toBe(`Bearer ${token}`);
  expect(solicitudPublica[1].headers.Authorization).toBeUndefined();

  await act(async () => {
    resolverLogout({ ok: true, status: 200, json: async () => ({}) });
    await cierre;
  });
});
