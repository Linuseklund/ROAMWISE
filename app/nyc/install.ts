import type { Metadata } from "next";

/** Lets "Add to Home Screen" install the guide as an app that opens /nyc full screen. */
export const installable: Pick<Metadata, "manifest" | "icons" | "appleWebApp"> = {
  manifest: "/nyc.webmanifest",
  icons: { icon: [{ url: "/nyc-icon-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/nyc-apple-touch-icon.png", sizes: "180x180" }] },
  appleWebApp: { capable: true, title: "NYC på linjen", statusBarStyle: "black" },
};
