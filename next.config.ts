import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // SaaS multi-loja: lojistas cadastram logo/banner/capa via URL de
    // qualquer host (ex.: i.postimg.cc, blob storage). Permitimos qualquer
    // host HTTPS para que o next/image consiga otimizar e exibir essas imagens
    // em vez de quebrar com "host not configured under images".
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
