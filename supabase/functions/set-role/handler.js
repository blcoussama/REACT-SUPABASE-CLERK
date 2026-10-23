// Pure request handler of the "set-role" Edge Function (no Deno / Clerk import here,
// so that it can be unit-tested with Vitest; see index.ts for the wiring).

export const ROLES = ["candidate", "recruiter"];

const json = (status, body, headers) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

const corsHeaders = (origin, allowedOrigins) =>
  origin && allowedOrigins.includes(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
        Vary: "Origin",
      }
    : { Vary: "Origin" };

/**
 * POST { "role": "candidate" | "recruiter" } with "Authorization: Bearer <Clerk session token>".
 * Stores the role in the Clerk *public* metadata (not writable by the browser).
 * The role can be chosen only once: changing it requires an administrator (Clerk dashboard).
 *
 * @param {object} deps
 * @param {(token: string) => Promise<string>} deps.verifySessionToken returns the Clerk user id, throws if invalid
 * @param {(userId: string) => Promise<{ publicMetadata?: object }>} deps.getUser
 * @param {(userId: string, role: string) => Promise<void>} deps.setPublicRole
 * @param {string[]} deps.allowedOrigins front-end origins allowed to call the function
 */
export const createHandler = ({ verifySessionToken, getUser, setPublicRole, allowedOrigins }) =>
  async (req) => {
    const cors = corsHeaders(req.headers.get("origin"), allowedOrigins);

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

    const authorization = req.headers.get("authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!token) return json(401, { error: "Missing session token" }, cors);

    let userId;
    try {
      userId = await verifySessionToken(token);
    } catch {
      return json(401, { error: "Invalid session token" }, cors);
    }
    if (!userId) return json(401, { error: "Invalid session token" }, cors);

    let body;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON body" }, cors);
    }
    const keys = body && typeof body === "object" && !Array.isArray(body) ? Object.keys(body) : [];
    if (keys.length !== 1 || keys[0] !== "role" || !ROLES.includes(body.role)) {
      return json(400, { error: `role must be one of: ${ROLES.join(", ")}` }, cors);
    }

    const user = await getUser(userId);
    const current = user?.publicMetadata?.role;
    if (current) {
      return current === body.role
        ? json(200, { role: current }, cors)
        : json(409, { error: "The role has already been chosen" }, cors);
    }

    await setPublicRole(userId, body.role);
    return json(200, { role: body.role }, cors);
  };
