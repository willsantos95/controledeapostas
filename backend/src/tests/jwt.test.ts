import { describe, it, expect, beforeAll } from "vitest";
import { generateAccessToken, generateRefreshToken, verifyToken, AuthUser } from "../utils/jwt";

const user: AuthUser = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "user@example.com",
  tenant_id: "22222222-2222-2222-2222-222222222222",
  role: "owner",
};

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-key-with-at-least-32-characters";
});

describe("jwt utils", () => {
  it("generates and verifies an access token", () => {
    const token = generateAccessToken(user);
    const decoded = verifyToken<any>(token);
    expect(decoded.sub).toBe(user.id);
    expect(decoded.email).toBe(user.email);
    expect(decoded.tenant_id).toBe(user.tenant_id);
    expect(decoded.role).toBe(user.role);
  });

  it("generates and verifies a refresh token", () => {
    const token = generateRefreshToken(user);
    const decoded = verifyToken<any>(token);
    expect(decoded.sub).toBe(user.id);
    expect(decoded.type).toBe("refresh");
  });

  it("throws on invalid token", () => {
    expect(() => verifyToken("not-a-real-token")).toThrow();
  });
});
