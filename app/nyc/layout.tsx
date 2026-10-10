import type { Metadata, Viewport } from "next";
import { installable } from "./install";

export const viewport: Viewport = { themeColor: "#000000" };

export const metadata: Metadata = {
  title: "Vinyl & sneakers på linjen — Roamwise New York",
  ...installable,
  description: "House på vinyl, sneakers (nytt, resell, begagnat) och second hand-streetwear i New York – med öppettider, karta och subway-väg från din position.",
};

export default function NycLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children }
