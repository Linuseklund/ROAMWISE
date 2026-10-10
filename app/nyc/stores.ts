import { sneakerStores, type SneakerStore } from "../sneakers/stores";
import type { Gateway } from "../vinyl/subway";
import { vinylStores } from "../vinyl/stores";

// One list for the combined guide: house vinyl and sneakers/streetwear.

export type Category = "vinyl" | "sneakers";

export const categories: Record<Category, { label: string; tag: string; bg: string; fg: string }> = {
  vinyl: { label: "Vinyl", tag: "VINYL · HOUSE", bg: "#EE352E", fg: "#fff" },
  sneakers: { label: "Sneakers & streetwear", tag: "SNEAKERS", bg: "#00933C", fg: "#fff" },
};

export type GuideStore = SneakerStore & { cat: Category; gateway?: Gateway };

export const guideStores: GuideStore[] = [
  ...vinylStores.map(({ stock, ...store }) => ({ ...store, cat: "vinyl" as const, types: stock })),
  ...sneakerStores.map((store) => ({ ...store, cat: "sneakers" as const })),
];
