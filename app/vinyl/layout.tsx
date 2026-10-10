import type { Metadata, Viewport } from "next";
import { installable } from "../nyc/install";

export const viewport: Viewport = { themeColor: "#000000" };

export const metadata: Metadata = {
  ...installable,
  title: "House på vinyl — Roamwise New York",
  description: "De bästa skivbutikerna för house music i New York – nytt och begagnat, med öppettider, karta och subway-väg från din position.",
};

export default function VinylLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children }
