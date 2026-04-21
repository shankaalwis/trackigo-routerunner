import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/scheduler/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bus Turn Scheduler — Kaduwela ↔ Colombo" },
      {
        name: "description",
        content:
          "Fair round-robin daily bus turn allocation for the Kaduwela–Colombo route with peak/off-peak intervals and live queue visualization.",
      },
      { property: "og:title", content: "Bus Turn Scheduler" },
      {
        property: "og:description",
        content: "Production-style dispatch dashboard for daily bus turn allocation.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <Dashboard />;
}
