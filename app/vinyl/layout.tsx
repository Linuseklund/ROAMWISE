import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "House på vinyl — Roamwise New York",
  description: "De bästa skivbutikerna för house music i New York – nytt och begagnat, med öppettider, karta och subway-väg från din position.",
};

export default function VinylLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children }
