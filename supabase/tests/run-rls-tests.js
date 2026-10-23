/**
 * Runs the pgTAP tests of supabase/tests/*.test.sql against a PostgreSQL that has
 * the Supabase roles (Docker image supabase/postgres, see README):
 *   1. as superuser: applies 00_supabase_shim.sql (auth.jwt(), storage tables) - idempotent;
 *   2. as "postgres" (the role used by Supabase migrations), in ONE transaction per test file:
 *      applies every supabase/migrations/*.sql, runs the tests, then ROLLBACK (database left clean).
 *
 * Env: DATABASE_URL (default postgres://postgres:postgres@127.0.0.1:55460/postgres)
 *      ADMIN_DATABASE_URL (default: same URL with the supabase_admin user)
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'migrations');

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:55460/postgres';
const adminUrl = process.env.ADMIN_DATABASE_URL ?? databaseUrl.replace('//postgres:', '//supabase_admin:');

const sqlFiles = (dir, filter) =>
    readdirSync(dir)
        .filter(filter)
        .sort()
        .map((file) => ({ file, sql: readFileSync(join(dir, file), 'utf8') }));

const rowsOf = (result) => (Array.isArray(result) ? result : [result]).flatMap((r) => r.rows ?? []);

const admin = new pg.Client({ connectionString: adminUrl });
await admin.connect();
await admin.query(readFileSync(join(here, '00_supabase_shim.sql'), 'utf8'));
await admin.end();

const migrations = sqlFiles(migrationsDir, (f) => f.endsWith('.sql'));
const testFiles = sqlFiles(here, (f) => f.endsWith('.test.sql'));

let failed = false;
for (const { file, sql } of testFiles) {
    const client = new pg.Client({ connectionString: databaseUrl });
    client.on('notice', (n) => console.log(`# NOTICE: ${n.message}`));
    await client.connect();
    console.log(`# ${file}`);
    try {
        await client.query('begin');
        await client.query("set local client_min_messages = warning");
        for (const migration of migrations) await client.query(migration.sql);
        const lines = rowsOf(await client.query(sql))
            .flatMap((row) => Object.values(row))
            .filter((value) => typeof value === 'string' && /^(ok|not ok|1\.\.|#)/.test(value));
        for (const line of lines) console.log(line);

        const plan = lines.find((l) => l.startsWith('1..'));
        const planned = plan ? Number(plan.slice(3)) : NaN;
        const passed = lines.filter((l) => l.startsWith('ok ')).length;
        const notOk = lines.filter((l) => l.startsWith('not ok')).length;
        if (notOk > 0 || passed !== planned) failed = true;
        console.log(`# ${file}: ${passed}/${planned} passed`);
    } catch (err) {
        failed = true;
        console.error(`# ${file}: error: ${err.message}`);
    } finally {
        await client.query('rollback').catch(() => {});
        await client.end();
    }
}

process.exit(failed ? 1 : 0);
