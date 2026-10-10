import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vinyl & sneakers på linjen — Roamwise New York",
  description: "House på vinyl, sneakers (nytt, resell, begagnat) och second hand-streetwear i New York – med öppettider, karta och subway-väg från din position.",
};

export default function NycLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children }
