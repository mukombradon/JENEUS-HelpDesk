import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  Users,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  UserCheck,
  Clock,
  TrendingUp,
  Shield,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Separator } from "../../components/ui/separator";
import { Skeleton } from "../../components/ui/skeleton";
import { Badge } from "../../components/ui/badge";
import api from "../../lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentMetric {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string | null;
  totalAssigned: number;
  resolved: number;
  inProgress: number;
  open: number;
  breached: number;
  slaCompliancePercent: number;
  avgResolutionHours: number;
  resolutionRate: number;
}

interface AgentReportData {
  agents: AgentMetric[];
}

// ---------------------------------------------------------------------------
// Date presets
// ---------------------------------------------------------------------------

const DATE_PRESETS = [
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
  { label: "Custom Range", value: "custom" },
];

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function AgentSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-64" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = Math.floor(hours / 24);
  const remaining = hours % 24;
  return `${days}d ${Math.round(remaining)}h`;
}

const roleColors: Record<string, string> = {
  admin: "bg-semantic-warning/15 text-semantic-warning border-semantic-warning/30",
  team_lead: "bg-primary/15 text-primary border-primary/30",
  agent: "bg-surface-3 text-ink-muted border-hairline",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AgentReportPage() {
  const navigate = useNavigate();
  const [datePreset, setDatePreset] = useState("30d");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const getDateParams = () => {
    if (datePreset === "custom") {
      return { dateFrom: startDate, dateTo: endDate };
    }
    const now = new Date();
    let start: Date;
    switch (datePreset) {
      case "7d": start = subDays(now, 7); break;
      case "90d": start = subDays(now, 90); break;
      default: start = subDays(now, 30);
    }
    return { dateFrom: format(start, "yyyy-MM-dd"), dateTo: format(now, "yyyy-MM-dd") };
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["report-agents", datePreset, startDate, endDate],
    queryFn: () =>
      api.get<AgentReportData>("/reports/agents", { params: getDateParams() }).then((r) => r.data),
  });

  const agents = data?.agents ?? [];
  const hasData = agents.length > 0;

  // Aggregate metrics
  const totalResolved = agents.reduce((sum, a) => sum + a.resolved, 0);
  const totalBreached = agents.reduce((sum, a) => sum + a.breached, 0);
  const avgResolutionAll =
    agents.length > 0
      ? agents.reduce((sum, a) => sum + a.avgResolutionHours, 0) / agents.length
      : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/reports")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Users className="h-5 w-5 text-ink-subtle" />
          <h1 className="text-lg font-semibold text-ink">Agent Report</h1>
        </div>
      </div>

      {/* Date range selector */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-hairline">
        <Select value={datePreset} onValueChange={setDatePreset}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {datePreset === "custom" && (
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-surface-2 border border-hairline rounded-md px-2 py-1 text-sm text-ink"
            />
            <span className="text-ink-subtle">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-surface-2 border border-hairline rounded-md px-2 py-1 text-sm text-ink"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-dark p-6 space-y-6">
        {isLoading ? (
          <AgentSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16">
            <div className="rounded-pill bg-semantic-danger/10 p-4 mb-4">
              <AlertCircle className="h-8 w-8 text-semantic-danger" />
            </div>
            <h3 className="text-base font-medium text-ink mb-1">Failed to load agent report</h3>
            <p className="text-sm text-ink-subtle mb-4 max-w-xs">
              An error occurred while fetching agent performance data.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16">
            <div className="rounded-pill bg-surface-2 p-4 mb-4">
              <UserCheck className="h-8 w-8 text-ink-muted" />
            </div>
            <h3 className="text-base font-medium text-ink mb-1">No agent data available</h3>
            <p className="text-sm text-ink-subtle mb-4 max-w-xs">
              No agents with ticket assignments were found for the selected period.
            </p>
          </div>
        ) : (
          <>
            {/* Summary row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="rounded-md bg-primary/10 p-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">Active Agents</p>
                    <p className="text-2xl font-semibold text-ink">{agents.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="rounded-md bg-semantic-success/10 p-2">
                    <TrendingUp className="h-4 w-4 text-semantic-success" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">Resolved</p>
                    <p className="text-2xl font-semibold text-ink">{totalResolved}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="rounded-md bg-semantic-warning/10 p-2">
                    <Clock className="h-4 w-4 text-semantic-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">Avg Resolution</p>
                    <p className="text-2xl font-semibold text-ink">
                      {formatHours(avgResolutionAll)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="rounded-md bg-semantic-danger/10 p-2">
                    <Shield className="h-4 w-4 text-semantic-danger" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">SLA Breaches</p>
                    <p className="text-2xl font-semibold text-ink">{totalBreached}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Agent performance table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-ink">
                  Agent Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-hairline">
                        <th className="text-left py-2 px-3 text-ink-subtle font-medium">Agent</th>
                        <th className="text-left py-2 px-3 text-ink-subtle font-medium">Role</th>
                        <th className="text-left py-2 px-3 text-ink-subtle font-medium">Team</th>
                        <th className="text-right py-2 px-3 text-ink-subtle font-medium">Assigned</th>
                        <th className="text-right py-2 px-3 text-ink-subtle font-medium">Resolved</th>
                        <th className="text-right py-2 px-3 text-ink-subtle font-medium">Rate</th>
                        <th className="text-right py-2 px-3 text-ink-subtle font-medium">Avg Time</th>
                        <th className="text-right py-2 px-3 text-ink-subtle font-medium">SLA</th>
                        <th className="text-right py-2 px-3 text-ink-subtle font-medium">Breached</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map((agent) => (
                        <tr key={agent.id} className="border-b border-hairline last:border-0 hover:bg-surface-1/50">
                          <td className="py-2.5 px-3">
                            <div>
                              <p className="text-ink font-medium">{agent.name}</p>
                              <p className="text-xs text-ink-muted">{agent.email}</p>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge className={roleColors[agent.role] ?? ""}>
                              {agent.role.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-ink-muted">{agent.team ?? "—"}</td>
                          <td className="py-2.5 px-3 text-right text-ink">{agent.totalAssigned}</td>
                          <td className="py-2.5 px-3 text-right text-ink">{agent.resolved}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`font-medium ${
                                agent.resolutionRate >= 70
                                  ? "text-semantic-success"
                                  : agent.resolutionRate >= 40
                                    ? "text-semantic-warning"
                                    : "text-semantic-danger"
                              }`}
                            >
                              {agent.resolutionRate}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-ink">
                            {formatHours(agent.avgResolutionHours)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`font-medium ${
                                agent.slaCompliancePercent >= 95
                                  ? "text-semantic-success"
                                  : agent.slaCompliancePercent >= 80
                                    ? "text-semantic-warning"
                                    : "text-semantic-danger"
                              }`}
                            >
                              {agent.slaCompliancePercent}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-ink">
                            <span
                              className={
                                agent.breached > 0
                                  ? "text-semantic-danger font-medium"
                                  : "text-ink-muted"
                              }
                            >
                              {agent.breached}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
