import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  Clock,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Shield,
  RefreshCw,
  AlertCircle,
  BarChart3,
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

interface SlaSummary {
  totalTracked: number;
  breached: number;
  compliant: number;
  compliancePercent: number;
}

interface PriorityBreakdown {
  priority: string;
  count: number;
}

interface ClientBreakdown {
  clientId: string;
  clientName: string;
  count: number;
}

interface SlaReportData {
  summary: SlaSummary;
  byPriority: PriorityBreakdown[];
  byClient: ClientBreakdown[];
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

function SlaSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Priority badge color
// ---------------------------------------------------------------------------

const priorityColor: Record<string, string> = {
  critical: "bg-semantic-danger/10 text-semantic-danger",
  high: "bg-semantic-warning/10 text-semantic-warning",
  medium: "bg-primary/10 text-primary",
  low: "bg-ink-muted/10 text-ink-muted",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SLAPage() {
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
    queryKey: ["report-sla", datePreset, startDate, endDate],
    queryFn: () =>
      api.get<SlaReportData>("/reports/sla", { params: getDateParams() }).then((r) => r.data),
  });

  const summary = data?.summary;
  const byPriority = data?.byPriority ?? [];
  const byClient = data?.byClient ?? [];

  const hasData = summary && summary.totalTracked > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/reports")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Clock className="h-5 w-5 text-ink-subtle" />
          <h1 className="text-lg font-semibold text-ink">SLA Report</h1>
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
          <SlaSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16">
            <div className="rounded-pill bg-semantic-danger/10 p-4 mb-4">
              <AlertCircle className="h-8 w-8 text-semantic-danger" />
            </div>
            <h3 className="text-base font-medium text-ink mb-1">Failed to load SLA report</h3>
            <p className="text-sm text-ink-subtle mb-4 max-w-xs">
              An error occurred while fetching SLA report data.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16">
            <div className="rounded-pill bg-surface-2 p-4 mb-4">
              <BarChart3 className="h-8 w-8 text-ink-muted" />
            </div>
            <h3 className="text-base font-medium text-ink mb-1">No SLA data available</h3>
            <p className="text-sm text-ink-subtle mb-4 max-w-xs">
              No tickets with SLA tracking were found for the selected period.
            </p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="rounded-md bg-primary/10 p-2">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">Compliance</p>
                    <p className="text-2xl font-semibold text-ink">{summary.compliancePercent}%</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="rounded-md bg-semantic-success/10 p-2">
                    <CheckCircle className="h-4 w-4 text-semantic-success" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">Compliant</p>
                    <p className="text-2xl font-semibold text-ink">{summary.compliant}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="rounded-md bg-semantic-danger/10 p-2">
                    <AlertTriangle className="h-4 w-4 text-semantic-danger" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">Breached</p>
                    <p className="text-2xl font-semibold text-ink">{summary.breached}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="rounded-md bg-surface-2 p-2">
                    <BarChart3 className="h-4 w-4 text-ink-subtle" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">Total Tracked</p>
                    <p className="text-2xl font-semibold text-ink">{summary.totalTracked}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* By Priority */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-ink">Breach Rate by Priority</CardTitle>
              </CardHeader>
              <CardContent>
                {byPriority.length === 0 ? (
                  <p className="text-sm text-ink-muted text-center py-8">No priority data available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-hairline">
                          <th className="text-left py-2 px-3 text-ink-subtle font-medium">Priority</th>
                          <th className="text-right py-2 px-3 text-ink-subtle font-medium">Count</th>
                          <th className="text-right py-2 px-3 text-ink-subtle font-medium">% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byPriority.map((p) => (
                          <tr key={p.priority} className="border-b border-hairline last:border-0">
                            <td className="py-2.5 px-3">
                              <Badge className={priorityColor[p.priority] ?? ""}>
                                {p.priority}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right text-ink">{p.count}</td>
                            <td className="py-2.5 px-3 text-right text-ink">
                              {summary.totalTracked > 0
                                ? Math.round((p.count / summary.totalTracked) * 100)
                                : 0}
                              %
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* By Client */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-ink">Breach Rate by Client</CardTitle>
              </CardHeader>
              <CardContent>
                {byClient.length === 0 ? (
                  <p className="text-sm text-ink-muted text-center py-8">No client data available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-hairline">
                          <th className="text-left py-2 px-3 text-ink-subtle font-medium">Client</th>
                          <th className="text-right py-2 px-3 text-ink-subtle font-medium">Breach Count</th>
                          <th className="text-right py-2 px-3 text-ink-subtle font-medium">% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byClient.map((c) => (
                          <tr key={c.clientId} className="border-b border-hairline last:border-0">
                            <td className="py-2.5 px-3 text-ink">{c.clientName}</td>
                            <td className="py-2.5 px-3 text-right text-ink">{c.count}</td>
                            <td className="py-2.5 px-3 text-right text-ink">
                              {summary.totalTracked > 0
                                ? Math.round((c.count / summary.totalTracked) * 100)
                                : 0}
                              %
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
