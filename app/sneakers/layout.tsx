import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sneakers på linjen — Roamwise New York",
  description: "New Yorks sneakerbutiker – nytt, resell och begagnat – plus second hand-streetwear, med öppettider, karta och subway-väg från din position.",
};

export default function SneakersLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children }
