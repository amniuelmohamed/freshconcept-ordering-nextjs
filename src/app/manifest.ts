import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fresh Concept Ordering Portal",
    short_name: "Fresh Concept",
    description: "B2B wholesale ordering platform for Fresh Concept clients and employees",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3b82f6",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["business", "productivity"],
    shortcuts: [
      {
        name: "Quick Order",
        short_name: "Order",
        description: "Place a quick order",
        url: "/quick-order",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
          },
        ],
      },
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "View dashboard",
        url: "/dashboard",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
          },
        ],
      },
    ],
  };
}

