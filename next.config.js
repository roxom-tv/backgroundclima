/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        // eslint-config-next is incompatible with ESLint 9 flat config.
        // Linting is still available via `npm run lint`.
        ignoreDuringBuilds: true,
    },
    images: {
        // Images are served from R2 via the /api/media route (already sized) and
        // the Next image optimizer is not wired on OpenNext/Cloudflare Workers.
        // Disable optimization so <Image> serves these URLs directly.
        unoptimized: true,
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;

import('@opennextjs/cloudflare').then((m) => m.initOpenNextCloudflareForDev());
