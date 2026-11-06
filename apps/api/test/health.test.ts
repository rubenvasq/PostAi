import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const app = createApp();

describe("GET /health", () => {
  it("responde ok con la versión del servicio", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "ok", version: "0.1.0" });
    expect(response.headers["x-request-id"]).toBeTruthy();
  });
});

describe("rutas desconocidas", () => {
  it("responde 404 con el formato de error del contrato", async () => {
    const response = await request(app).get("/no-existe");

    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({ code: "NOT_FOUND" });
    expect(response.body.error.requestId).toBeTruthy();
  });
});
