import { jest } from "@jest/globals";
import { createElement as h } from "react";
import { render, screen } from "@testing-library/react";
import GrabacionAudiencia from "../src/components/GrabacionAudiencia.jsx";

test("no muestra ni solicita grabaciones que no están publicadas", () => {
  global.fetch = jest.fn();
  const audiencia = {
    id_audiencia: 3,
    cuij: "21-12345678-9",
    estado: "REALIZADA",
    tiene_video: false,
  };

  const { container } = render(h(GrabacionAudiencia, { audiencia }));

  expect(container.firstChild).toBeNull();
  expect(global.fetch).not.toHaveBeenCalled();
});

test("reproduce una grabación publicada desde el detalle público", async () => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      data: {
        url: "/audiencias/3/video?exp=1800000000&sig=public-signature&scope=public",
        expires_in: 900,
      },
    }),
  }));
  const audiencia = {
    id_audiencia: 3,
    cuij: "21-12345678-9",
    estado: "REALIZADA",
    tiene_video: true,
  };

  render(h(GrabacionAudiencia, { audiencia }));

  expect(await screen.findByLabelText(/Grabación de la audiencia/)).toBeTruthy();
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/audiencias/3/video-url"),
    expect.objectContaining({ method: "GET" }),
  );
});
