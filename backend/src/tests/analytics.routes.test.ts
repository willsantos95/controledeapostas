import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-key-with-at-least-32-characters";
});

const app = createApp();

describe("analytics routes validation (no DB required)", () => {
  it("rejects unauthenticated summary access", async () => {
    const res = await request(app).get("/analytics/summary");
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated cumulative access", async () => {
    const res = await request(app).get("/analytics/cumulative");
    expect(res.status).toBe(401);
  });
});
