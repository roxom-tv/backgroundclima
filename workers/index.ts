/**
 * Custom Cloudflare Worker entry point.
 *
 * Re-exports the OpenNext generated fetch handler which handles all HTTP traffic.
 * wrangler.jsonc must point `"main"` to the built output of this file, NOT
 * to .open-next/worker.js directly.
 */
export { default } from '../.open-next/worker.js';
