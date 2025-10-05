/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ["@prisma/client"],
    },
    images: {
        domains: ["localhost"],
    },
};

export default nextConfig;
