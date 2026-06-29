import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

interface D1DatabaseLike {
    prepare(query: string): {
        bind(
            ...values: unknown[]
        ): D1DatabaseLike['prepare'] extends (q: string) => infer R ? R : never;
        first<T = unknown>(colName?: string): Promise<T | null>;
        run(): Promise<{ meta: Record<string, unknown> }>;
        all<T = unknown>(): Promise<{ results: T[] }>;
        raw<T = unknown[]>(): Promise<T[]>;
    };
    exec(query: string): Promise<{ count: number; duration: number }>;
    batch<T = unknown>(
        statements: ReturnType<D1DatabaseLike['prepare']>[],
    ): Promise<{ results: T[] }[]>;
    dump(): Promise<ArrayBuffer>;
}

interface D1Env {
    DB?: D1DatabaseLike;
}

export type DrizzleD1Client = ReturnType<typeof drizzle<typeof schema>>;

export async function getDb(): Promise<DrizzleD1Client> {
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx.env as unknown as D1Env;

    if (!env.DB) {
        throw new Error(
            '[lib/db/client] D1 binding "DB" is not available. ' +
                'Ensure the wrangler.jsonc d1_databases binding is configured ' +
                'and you are running inside a Cloudflare Workers context.',
        );
    }

    return drizzle(env.DB as unknown as Parameters<typeof drizzle>[0], { schema });
}
