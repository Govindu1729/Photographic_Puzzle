import type { NextConfig } from "next";

// For GitHub Pages project sites (https://<user>.github.io/<repo>),
// set NEXT_BASE_PATH to "/<repo>" before building, e.g.:
//   NEXT_BASE_PATH=/my-photo-merge npm run build
// For user/org pages (https://<user>.github.io) leave it empty.
const basePath = process.env.NEXT_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Static HTML export — produces a ./out folder ready for GitHub Pages.
  output: "export",
  // GitHub Pages serves pre-built assets; trailing slashes are friendlier.
  trailingSlash: true,
  // Project sites live under a subpath; user/org sites live at root.
  basePath,
  // No Next image server needed — use plain <img> rendering (works on GH Pages).
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
