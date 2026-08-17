import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-key-with-at-least-32-characters";
});

const app = createApp();

describe("bets routes validation (no DB required)", () => {
  it("rejects unauthenticated access to list bets", async () => {
    const res = await request(app).get("/bets");
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated bet creation", async () => {
    const res = await request(app).post("/bets").send({});
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated bet detail", async () => {
    const res = await request(app).get("/bets/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated screenshot upload", async () => {
    const res = await request(app).post("/bets/upload-screenshot");
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated result registration", async () => {
    const res = await request(app)
      .post("/bets/00000000-0000-0000-0000-000000000000/result")
      .send({ status: "won" });
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated delete", async () => {
    const res = await request(app).delete("/bets/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(401);
  });
});
