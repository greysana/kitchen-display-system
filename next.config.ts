import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "https://1881ebec93be.ngrok-free.app",
    "*.ngrok-free.app",
  ],
};

export default nextConfig;
