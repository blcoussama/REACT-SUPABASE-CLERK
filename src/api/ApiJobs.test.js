import { describe, expect, it } from "vitest";
import { createMockSupabase } from "@/test/mockSupabase";
import { getJobs, saveJob } from "./ApiJobs";

describe("saveJob", () => {
  it("un-saving removes only the current user's bookmark (job_id AND user_id)", async () => {
    const supabase = createMockSupabase();
    await saveJob(supabase, { alreadySaved: true }, { user_id: "user_1", job_id: 7 });

    const { table, calls } = supabase.queries[0];
    expect(table).toBe("saved_jobs");
    expect(calls).toEqual([["delete"], ["eq", "job_id", 7], ["eq", "user_id", "user_1"]]);
  });

  it("saving inserts the bookmark", async () => {
    const supabase = createMockSupabase({ results: { saved_jobs: { data: [{ id: 1 }], error: null } } });
    const data = await saveJob(supabase, { alreadySaved: false }, { user_id: "user_1", job_id: 7 });

    expect(supabase.queries[0].calls[0]).toEqual(["insert", [{ user_id: "user_1", job_id: 7 }]]);
    expect(data).toHaveLength(1);
  });
});

describe("getJobs", () => {
  it("applies the location, company and title filters", async () => {
    const supabase = createMockSupabase();
    await getJobs(supabase, { location: "Tanger", company_id: "3", searchQuery: "react" });

    const { calls } = supabase.queries[0];
    expect(calls).toContainEqual(["eq", "location", "Tanger"]);
    expect(calls).toContainEqual(["eq", "company_id", "3"]);
    expect(calls).toContainEqual(["ilike", "title", "%react%"]);
  });

  it("throws when Supabase returns an error", async () => {
    const supabase = createMockSupabase({ results: { jobs: { data: null, error: { message: "boom" } } } });
    await expect(getJobs(supabase, {})).rejects.toThrow("Error fetching Jobs");
  });
});
