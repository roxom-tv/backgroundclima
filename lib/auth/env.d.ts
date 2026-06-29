// Merges admin password gate env bindings into the CloudflareEnv interface.
// When cloudflare-env.d.ts is regenerated from wrangler types, move DB and
// these secrets there and remove this file to avoid duplicate declarations.
interface CloudflareEnv {
    DB: D1Database;
    MEDIA_BUCKET: R2Bucket;
    NEXT_INC_CACHE_R2_BUCKET: R2Bucket;
    ADMIN_PASSWORD: string;
    SESSION_SECRET: string;
    COOKIE_DOMAIN: string;
    SESSION_TTL_DAYS?: string;
}
