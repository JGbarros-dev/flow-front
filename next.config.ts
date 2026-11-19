import type { NextConfig } from "next";

// Exportação estática: o frontend vira HTML/JS puro (Vercel, Railway ou qualquer servidor estático)
// e conversa com a API Node.js definida em NEXT_PUBLIC_API_URL.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
