import { describe, expect, it } from "vitest";
import { createMockSupabase, fakeFile } from "@/test/mockSupabase";
import { applyToJob, getResumeUrl, updateApplicationStatus } from "./ApiApplications";

const application = {
  job_id: 12,
  candidate_id: "user_candidate_1",
  name: "Candidate One",
  status: "applied",
  skills: "react",
  experience: 2,
  education: "Graduate",
};

describe("applyToJob", () => {
  it("uploads the resume into the candidate's folder of the PRIVATE bucket and stores only its path", async () => {
    const supabase = createMockSupabase({ results: { applications: { data: [{ id: 1 }], error: null } } });
    await applyToJob(supabase, {}, { ...application, resume: fakeFile("cv.pdf", "application/pdf") });

    expect(supabase.storage.from).toHaveBeenCalledWith("resumes");
    const [path, , options] = supabase.bucket.upload.mock.calls[0];
    expect(path).toMatch(/^user_candidate_1\/12-[0-9a-f-]{36}\.pdf$/); // unguessable name, own folder
    expect(options).toMatchObject({ upsert: false, contentType: "application/pdf" });

    const insert = supabase.queries[0].calls.find(([method]) => method === "insert")[1][0];
    expect(insert.resume).toBe(path);
    expect(insert.resume).not.toMatch(/^https?:|\/public\//);
  });

  it("removes the uploaded file when the application is refused (e.g. by RLS)", async () => {
    const supabase = createMockSupabase({
      results: { applications: { data: null, error: { code: "42501", message: "row-level security" } } },
    });
    await expect(
      applyToJob(supabase, {}, { ...application, resume: fakeFile("cv.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document") }),
    ).rejects.toThrow("Error submitting Application");

    const [path] = supabase.bucket.upload.mock.calls[0];
    expect(path).toMatch(/\.docx$/);
    expect(supabase.bucket.remove).toHaveBeenCalledWith([path]);
  });

  it("refuses an unsupported file type before uploading anything", async () => {
    const supabase = createMockSupabase();
    await expect(applyToJob(supabase, {}, { ...application, resume: fakeFile("cv.html", "text/html") })).rejects.toThrow(
      "Unsupported file type",
    );
    expect(supabase.bucket.upload).not.toHaveBeenCalled();
  });
});

describe("updateApplicationStatus", () => {
  it("updates ONE application, filtered on its id (not on the job id)", async () => {
    const supabase = createMockSupabase({ results: { applications: { data: [{ id: 42, status: "hired" }], error: null } } });
    await updateApplicationStatus(supabase, { application_id: 42 }, "hired");

    const { table, calls } = supabase.queries[0];
    expect(table).toBe("applications");
    expect(calls).toContainEqual(["update", { status: "hired" }]);
    expect(calls).toContainEqual(["eq", "id", 42]);
    expect(calls.some(([method, column]) => method === "eq" && column === "job_id")).toBe(false);
  });

  it("fails when RLS lets no row through", async () => {
    const supabase = createMockSupabase({ results: { applications: { data: [], error: null } } });
    await expect(updateApplicationStatus(supabase, { application_id: 42 }, "hired")).rejects.toThrow();
  });
});

describe("getResumeUrl", () => {
  it("creates a signed URL valid for 60 seconds on the private bucket", async () => {
    const supabase = createMockSupabase();
    const url = await getResumeUrl(supabase, "user_candidate_1/12-abc.pdf");

    expect(supabase.storage.from).toHaveBeenCalledWith("resumes");
    expect(supabase.bucket.createSignedUrl).toHaveBeenCalledWith("user_candidate_1/12-abc.pdf", 60);
    expect(url).toContain("signed.example");
  });
});
