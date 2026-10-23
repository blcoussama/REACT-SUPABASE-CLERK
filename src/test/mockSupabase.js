import { vi } from "vitest";

/**
 * Minimal stand-in for the supabase-js client: records every query-builder call
 * (from / select / insert / update / delete / eq / ilike / single) and storage /
 * functions call, and answers with the configured results.
 */
export const createMockSupabase = ({ results = {}, storage: storageResults = {}, invoke } = {}) => {
  const queries = [];

  const from = (table) => {
    const query = { table, calls: [] };
    queries.push(query);
    const builder = {};
    for (const method of ["select", "insert", "update", "delete", "eq", "ilike", "single"]) {
      builder[method] = (...args) => {
        query.calls.push([method, ...args]);
        return builder;
      };
    }
    builder.then = (resolve, reject) =>
      Promise.resolve(results[table] ?? { data: [], error: null }).then(resolve, reject);
    return builder;
  };

  const bucket = {
    upload: vi.fn(async (path) => storageResults.upload ?? { data: { path }, error: null }),
    remove: vi.fn(async () => ({ data: [], error: null })),
    createSignedUrl: vi.fn(async (path) => storageResults.signed ?? { data: { signedUrl: `https://signed.example/${path}?token=x` }, error: null }),
    getPublicUrl: vi.fn((path) => ({ data: { publicUrl: `https://cdn.example/${path}` } })),
  };

  return {
    from: vi.fn(from),
    queries,
    storage: { from: vi.fn(() => bucket) },
    bucket,
    functions: { invoke: vi.fn(async (name, options) => invoke ?? { data: { role: options.body.role }, error: null }) },
  };
};

export const fakeFile = (name, type, size = 1024) => {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};
