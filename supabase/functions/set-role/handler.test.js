// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createHandler } from "./handler.js";

const ORIGIN = "http://localhost:5173";

const setup = ({ currentRole } = {}) => {
  const deps = {
    allowedOrigins: [ORIGIN],
    verifySessionToken: vi.fn(async (token) => {
      if (token !== "valid-clerk-token") throw new Error("invalid signature");
      return "user_123";
    }),
    getUser: vi.fn(async () => ({ publicMetadata: currentRole ? { role: currentRole } : {} })),
    setPublicRole: vi.fn(async () => {}),
  };
  return { deps, handler: createHandler(deps) };
};

const request = (body, { token = "valid-clerk-token", method = "POST", origin = ORIGIN } = {}) =>
  new Request("https://project.supabase.co/functions/v1/set-role", {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: method === "POST" ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  });

describe("set-role Edge Function", () => {
  it("stores the chosen role in the Clerk PUBLIC metadata of the verified user", async () => {
    const { deps, handler } = setup();
    const res = await handler(request({ role: "recruiter" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ role: "recruiter" });
    expect(deps.verifySessionToken).toHaveBeenCalledWith("valid-clerk-token");
    expect(deps.setPublicRole).toHaveBeenCalledWith("user_123", "recruiter");
    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
  });

  it("401 without a token or with a forged token", async () => {
    const { deps, handler } = setup();
    expect((await handler(request({ role: "candidate" }, { token: null }))).status).toBe(401);
    expect((await handler(request({ role: "candidate" }, { token: "forged" }))).status).toBe(401);
    expect(deps.setPublicRole).not.toHaveBeenCalled();
  });

  it("400 for an unknown role or extra fields (no other metadata can be injected)", async () => {
    const { deps, handler } = setup();
    for (const body of [{ role: "admin" }, { role: "recruiter", isAdmin: true }, {}, [], "not json", { role: ["recruiter"] }]) {
      expect((await handler(request(body))).status).toBe(400);
    }
    expect(deps.setPublicRole).not.toHaveBeenCalled();
  });

  it("409 when the role was already chosen: a candidate cannot become recruiter later", async () => {
    const { deps, handler } = setup({ currentRole: "candidate" });
    const res = await handler(request({ role: "recruiter" }));

    expect(res.status).toBe(409);
    expect(deps.setPublicRole).not.toHaveBeenCalled();
  });

  it("is idempotent when the same role is sent again", async () => {
    const { deps, handler } = setup({ currentRole: "candidate" });
    const res = await handler(request({ role: "candidate" }));

    expect(res.status).toBe(200);
    expect(deps.setPublicRole).not.toHaveBeenCalled();
  });

  it("answers the CORS preflight only for the allowed front-end origins", async () => {
    const { handler } = setup();
    const allowed = await handler(request(null, { method: "OPTIONS" }));
    const other = await handler(request(null, { method: "OPTIONS", origin: "https://evil.example" }));

    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("405 for other methods", async () => {
    const { handler } = setup();
    expect((await handler(request(null, { method: "GET" }))).status).toBe(405);
  });
});
