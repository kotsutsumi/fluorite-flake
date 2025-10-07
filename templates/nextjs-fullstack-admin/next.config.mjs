import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    outputFileTracingRoot: path.join(__dirname, '..', '..'),
    serverExternalPackages: ['@libsql/client', '@prisma/adapter-libsql'],
    webpack: (config, { isServer }) => {
        // Exclude libsql packages from client-side bundle
        if (!isServer) {
            config.externals = config.externals || [];
            config.externals.push({
                '@libsql/client': 'commonjs @libsql/client',
                '@prisma/adapter-libsql': 'commonjs @prisma/adapter-libsql',
                libsql: 'commonjs libsql',
            });

            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                crypto: false,
                stream: false,
                url: false,
                zlib: false,
                http: false,
                https: false,
                buffer: false,
            };
        }

        // Ignore libsql native files and documentation
        config.module.rules.push({
            test: /\.(node|md|txt|LICENSE)$/,
            type: 'asset/resource',
        });

        config.module.rules.push({
            test: /\.d\.ts$/,
            type: 'asset/resource',
        });

        return config;
    },
};

export default nextConfig;
