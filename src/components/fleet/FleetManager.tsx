import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bus } from "@/lib/scheduler/types";
import { DEFAULT_BUSES } from "@/lib/scheduler/defaults";
import { fetchBuses, saveBus, saveFleet } from "@/lib/data-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Bus as BusIcon, Save, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function FleetManager({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [newId, setNewId] = useState("");
  const [newDriver, setNewDriver] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const queryClient = useQueryClient();

  const { data: dbBuses, isLoading } = useQuery({
    queryKey: ["buses"],
    queryFn: fetchBuses,
  });

  if (dbBuses && !hydrated) {
    setBuses(dbBuses !== null ? dbBuses : DEFAULT_BUSES);
    setHydrated(true);
  }

  const saveMutation = useMutation({
    mutationFn: (newBuses: Bus[]) => saveFleet(newBuses),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buses"] });
      toast.success("Fleet saved successfully");
    },
    onError: (err: any) => {
      toast.error("Save failed", { description: err.message });
    },
  });

  const addBus = () => {
    const id = newId.trim();
    if (!id) {
      toast.error("Bus ID required");
      return;
    }
    if (buses.some((b) => b.id.toLowerCase() === id.toLowerCase())) {
      toast.error("Duplicate bus");
      return;
    }
    setBuses([...buses, { id, active: true, driver: newDriver.trim() }]);
    setNewId("");
    setNewDriver("");
  };

  const removeBus = (id: string) => {
    setBuses(buses.filter((b) => b.id !== id));
    toast.info(`${id} removed from fleet`);
  };

  const toggleActive = (id: string, active: boolean) => {
    setBuses(buses.map((b) => (b.id === id ? { ...b, active } : b)));
  };

  const updateDriver = (id: string, driver: string) => {
    setBuses(buses.map((b) => (b.id === id ? { ...b, driver } : b)));
  };

  return (
    <div className={isEmbedded ? "space-y-6" : "min-h-screen bg-background p-6"}>
      <div className={isEmbedded ? "space-y-6" : "mx-auto max-w-4xl space-y-6"}>
        {!isEmbedded && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Fleet Management</h1>
                <p className="text-muted-foreground">Manage your bus fleet and drivers.</p>
              </div>
            </div>
            <Button onClick={() => saveMutation.mutate(buses)} disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Saving..." : "Save Fleet"}
            </Button>
          </div>
        )}
        {isEmbedded && (
          <div className="flex items-center justify-between bg-muted/20 p-4 rounded-xl border border-border/50">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Fleet Management</h2>
              <p className="text-xs text-muted-foreground">Update bus details and active status.</p>
            </div>
            <Button onClick={() => saveMutation.mutate(buses)} disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Saving..." : "Save Fleet"}
            </Button>
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BusIcon className="h-5 w-5 text-primary" />
              Fleet List ({buses.length})
            </CardTitle>
            <Badge variant="secondary">
              {buses.filter((b) => b.active).length} Active Buses
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="mb-6 grid gap-4 rounded-xl border border-dashed border-border bg-muted/30 p-4 sm:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-1.5">
                <Label htmlFor="new-bus-id" className="text-xs">Bus ID / Reg No.</Label>
                <Input
                  id="new-bus-id"
                  placeholder="e.g. B101"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-bus-driver" className="text-xs">Assigned Driver (Optional)</Label>
                <Input
                  id="new-bus-driver"
                  placeholder="e.g. John Doe"
                  value={newDriver}
                  onChange={(e) => setNewDriver(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addBus} className="w-full sm:w-auto">
                  <Plus className="mr-1 h-4 w-4" /> Add Bus
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-32">Bus ID</TableHead>
                    <TableHead>Driver Name</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">Loading fleet...</TableCell>
                    </TableRow>
                  )}
                  {!isLoading && buses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No buses in fleet. Add one above.
                      </TableCell>
                    </TableRow>
                  )}
                  {buses.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-bold">{b.id}</TableCell>
                      <TableCell>
                        <Input
                          value={b.driver ?? ""}
                          onChange={(e) => updateDriver(b.id, e.target.value)}
                          placeholder="No driver assigned"
                          className="h-9 bg-transparent border-none focus-visible:ring-1"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={b.active}
                            onCheckedChange={(v) => toggleActive(b.id, v)}
                          />
                          <span className="text-xs font-medium">
                            {b.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBus(b.id)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
