import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-key-with-at-least-32-characters";
});

const app = createApp();

describe("calculators routes validation (no DB required)", () => {
  it("rejects unauthenticated distribution calculation", async () => {
    const res = await request(app).post("/calculators/distribution").send({});
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated free-bet calculation", async () => {
    const res = await request(app).post("/calculators/free-bet").send({});
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated from-calculator conversion", async () => {
    const res = await request(app).post("/bets/from-calculator").send({});
    expect(res.status).toBe(401);
  });
});
