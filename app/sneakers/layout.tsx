import type { Metadata, Viewport } from "next";
import { installable } from "../nyc/install";

export const viewport: Viewport = { themeColor: "#000000" };

export const metadata: Metadata = {
  ...installable,
  title: "Sneakers på linjen — Roamwise New York",
  description: "New Yorks sneakerbutiker – nytt, resell och begagnat – plus second hand-streetwear, med öppettider, karta och subway-väg från din position.",
};

export default function SneakersLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children }
