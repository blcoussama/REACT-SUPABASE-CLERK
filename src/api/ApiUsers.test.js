import { describe, expect, it } from "vitest";
import { createMockSupabase } from "@/test/mockSupabase";
import { setUserRole } from "./ApiUsers";

describe("setUserRole", () => {
  it("asks the set-role Edge Function (server side) instead of writing Clerk metadata from the browser", async () => {
    const supabase = createMockSupabase();
    const data = await setUserRole(supabase, {}, "recruiter");

    expect(supabase.functions.invoke).toHaveBeenCalledWith("set-role", { body: { role: "recruiter" } });
    expect(data).toEqual({ role: "recruiter" });
  });

  it("throws when the function refuses", async () => {
    const supabase = createMockSupabase({ invoke: { data: null, error: new Error("409") } });
    await expect(setUserRole(supabase, {}, "recruiter")).rejects.toThrow();
  });
});
