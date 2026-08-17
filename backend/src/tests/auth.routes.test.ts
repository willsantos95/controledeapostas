import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-key-with-at-least-32-characters";
});

const app = createApp();

describe("auth routes validation (no DB required)", () => {
  it("rejects signup without email/password", async () => {
    const res = await request(app).post("/auth/signup").send({});
    expect(res.status).toBe(400);
  });

  it("rejects signup with weak password", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "user@example.com", password: "weak" });
    expect(res.status).toBe(400);
  });

  it("rejects signup with invalid email", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "not-an-email", password: "Senha1234" });
    expect(res.status).toBe(400);
  });

  it("rejects login without credentials", async () => {
    const res = await request(app).post("/auth/login").send({});
    expect(res.status).toBe(400);
  });

  it("rejects /auth/me without token", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects /auth/refresh without cookie", async () => {
    const res = await request(app).get("/auth/refresh");
    expect(res.status).toBe(401);
  });

  it("returns ok on /health", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
