import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type RouteRow = {
  route: string;
  prefetched: boolean;
  count: number;
  avg_ms: number;
  p50_ms: number;
  p95_ms: number;
};
type VersionRow = { app_version: string; count: number; p95_ms: number };
type OsRow = { os_name: string; count: number; avg_ms: number; p95_ms: number };
type ConnRow = { connection_type: string; count: number; p95_ms: number };
type TransitionRow = {
  from_route: string;
  route: string;
  count: number;
  p95_ms: number;
};
type Summary = {
  total: number;
  days: number;
  by_route: RouteRow[];
  by_version: VersionRow[];
  by_os: OsRow[];
  by_connection: ConnRow[];
  worst_transitions: TransitionRow[];
};

const DAY_OPTIONS = [1, 7, 30];

const NavMetricsAdmin = () => {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [days, setDays] = useState(7);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gate access
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setAllowed(!!roles);
    })();
  }, [navigate]);

  // Load data
  useEffect(() => {
    if (!allowed) return;
    setLoading(true);
    setError(null);
    supabase
      .rpc("get_nav_metrics_summary", { _days: days })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData(data as unknown as Summary);
        setLoading(false);
      });
  }, [allowed, days]);

  if (allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Your account does not have the admin role. Ask a project owner to
            grant it via the user_roles table.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Navigation metrics</h1>
          <p className="text-sm text-muted-foreground">
            Aggregated client navigation latency from <code>nav_metrics</code>.
          </p>
        </div>
        <div className="flex gap-2">
          {DAY_OPTIONS.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? "default" : "outline"}
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
      </header>

      {error && (
        <Card>
          <CardContent className="pt-6 text-destructive text-sm">{error}</CardContent>
        </Card>
      )}

      {loading || !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                <span className="font-medium">{data.total.toLocaleString()}</span>{" "}
                events in the last {data.days} day(s).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By route (prefetched vs cold)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Avg ms</TableHead>
                    <TableHead className="text-right">p50</TableHead>
                    <TableHead className="text-right">p95</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.by_route.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{r.route}</TableCell>
                      <TableCell>
                        <Badge variant={r.prefetched ? "default" : "secondary"}>
                          {r.prefetched ? "prefetched" : "cold"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{r.count}</TableCell>
                      <TableCell className="text-right">{r.avg_ms}</TableCell>
                      <TableCell className="text-right">{r.p50_ms}</TableCell>
                      <TableCell className="text-right">{r.p95_ms}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>p95 by app version</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">p95 ms</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.by_version.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">
                          {r.app_version}
                        </TableCell>
                        <TableCell className="text-right">{r.count}</TableCell>
                        <TableCell className="text-right">{r.p95_ms}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By OS</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OS</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Avg</TableHead>
                      <TableHead className="text-right">p95</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.by_os.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.os_name}</TableCell>
                        <TableCell className="text-right">{r.count}</TableCell>
                        <TableCell className="text-right">{r.avg_ms}</TableCell>
                        <TableCell className="text-right">{r.p95_ms}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By connection</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">p95</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.by_connection.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.connection_type}</TableCell>
                        <TableCell className="text-right">{r.count}</TableCell>
                        <TableCell className="text-right">{r.p95_ms}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Worst transitions (p95)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From → To</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">p95</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.worst_transitions.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">
                          {r.from_route} → {r.route}
                        </TableCell>
                        <TableCell className="text-right">{r.count}</TableCell>
                        <TableCell className="text-right">{r.p95_ms}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default NavMetricsAdmin;
