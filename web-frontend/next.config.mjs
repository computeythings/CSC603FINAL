/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export', // Export as a static site
    trailingSlash: true, // Optional: Add trailing slashes to URLs
    images: {
        unoptimized: true, // Optional: Disable image optimization for static export
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*', // Match any requests to /api/*
                destination: 'http://localhost:5000/api/:path*', // Proxy to your backend server
            },
        ];
    },
};

export default nextConfig;
