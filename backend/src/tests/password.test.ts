import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword, isValidPassword, isValidEmail } from "../utils/password";

describe("password utils", () => {
  it("hashes and compares a password correctly", async () => {
    const hash = await hashPassword("Senha1234");
    expect(hash).not.toBe("Senha1234");
    expect(await comparePassword("Senha1234", hash)).toBe(true);
    expect(await comparePassword("errada", hash)).toBe(false);
  });

  it("validates password strength", () => {
    expect(isValidPassword("Senha1234")).toBe(true);
    expect(isValidPassword("senha1234")).toBe(false);
    expect(isValidPassword("SENHA1234")).toBe(false);
    expect(isValidPassword("Senhaabc")).toBe(false);
    expect(isValidPassword("Sh1")).toBe(false);
  });

  it("validates email format", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("invalid-email")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
  });
});
