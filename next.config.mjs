/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permitir imágenes externas si luego usas next/image (ahora usamos <img>)
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};
export default nextConfig;
