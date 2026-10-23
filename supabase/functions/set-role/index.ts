// Supabase Edge Function (Deno): sets the Clerk public metadata "role" of the caller.
// Deploy:  supabase functions deploy set-role --no-verify-jwt
//          supabase secrets set CLERK_SECRET_KEY=sk_... ALLOWED_ORIGINS=http://localhost:5173,https://your-app.example
// (--no-verify-jwt / verify_jwt = false: the function verifies the Clerk token itself, below.)
import { createClerkClient, verifyToken } from "npm:@clerk/backend@3.26.1";
import { createHandler } from "./handler.js";

const secretKey = Deno.env.get("CLERK_SECRET_KEY");
if (!secretKey) throw new Error("CLERK_SECRET_KEY is not set");

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const clerk = createClerkClient({ secretKey });

Deno.serve(
  createHandler({
    allowedOrigins,
    // Signature, expiry and "azp" (front-end origin) are checked against the Clerk instance keys.
    verifySessionToken: async (token: string) => (await verifyToken(token, { secretKey, authorizedParties: allowedOrigins })).sub,
    getUser: (userId: string) => clerk.users.getUser(userId),
    setPublicRole: async (userId: string, role: string) => {
      await clerk.users.updateUserMetadata(userId, { publicMetadata: { role } });
    },
  }),
);
