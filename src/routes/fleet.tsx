import { createFileRoute } from "@tanstack/react-router";
import { FleetManager } from "@/components/fleet/FleetManager";

export const Route = createFileRoute("/fleet")({
  component: FleetPage,
});

function FleetPage() {
  return <FleetManager />;
}
