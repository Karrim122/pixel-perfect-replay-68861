import { createFileRoute } from "@tanstack/react-router";
import { SystemApp } from "@/components/system/SystemApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Solo Leveling: System — Level Up Your Life" },
      { name: "description", content: "A gamified daily quest, weekly quest and focus system inspired by Solo Leveling. Rank up from E to Shadow Monarch." },
      { property: "og:title", content: "Solo Leveling: System" },
      { property: "og:description", content: "Daily quests, weekly quests, gates and ranks. Arise, Player." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SystemApp,
});
