import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tailwind is compiled by its Turbopack loader; there is no PostCSS step.
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
