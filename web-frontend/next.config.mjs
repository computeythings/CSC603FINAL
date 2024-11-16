/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export', // Export as a static site
    trailingSlash: true, // Optional: Add trailing slashes to URLs
    images: {
        unoptimized: true, // Optional: Disable image optimization for static export
    },
};

export default nextConfig;
