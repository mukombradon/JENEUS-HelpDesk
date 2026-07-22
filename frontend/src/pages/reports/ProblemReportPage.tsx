import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Bug,
  FolderOpen,
  TrendingUp,
  Layers,
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

interface ProblemEntry {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  client: string;
  category: string | null;
  assignedAgent: string | null;
  recurrenceCount: number;
  linkedIncidents: number;
  createdAt: string;
  resolvedAt: string | null;
}

interface RecurringCategory {
  categoryId: string;
  categoryName: string;
  incidentCount: number;
}

interface ProblemReportData {
  totalProblems: number;
  problems: ProblemEntry[];
  topRecurringCategories: RecurringCategory[];
}

// ---------------------------------------------------------------------------
// Date presets
// ---------------------------------------------------------------------------

const DATE_PRESETS = [
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
  { label: "Last 180 Days", value: "180d" },
  { label: "Custom Range", value: "custom" },
];

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ProblemsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

const statusVariant: Record<string, string> = {
  open: "open",
  in_progress: "in-progress",
  pending: "pending",
  resolved: "resolved",
  closed: "closed",
  cancelled: "cancelled",
};

const priorityVariant: Record<string, string> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ProblemReportPage() {
  const navigate = useNavigate();
  const [datePreset, setDatePreset] = useState("90d");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 90), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const getDateParams = () => {
    if (datePreset === "custom") {
      return { dateFrom: startDate, dateTo: endDate };
    }
    const now = new Date();
    let start: Date;
    switch (datePreset) {
      case "30d": start = subDays(now, 30); break;
      case "180d": start = subDays(now, 180); break;
      default: start = subDays(now, 90);
    }
    return { dateFrom: format(start, "yyyy-MM-dd"), dateTo: format(now, "yyyy-MM-dd") };
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["report-problems", datePreset, startDate, endDate],
    queryFn: () =>
      api.get<ProblemReportData>("/reports/problems", { params: getDateParams() }).then((r) => r.data),
  });

  const problems = data?.problems ?? [];
  const recurringCategories = data?.topRecurringCategories ?? [];
  const totalProblems = data?.totalProblems ?? 0;
  const hasData = totalProblems > 0;

  // Total linked incidents across all problems
  const totalLinkedIncidents = problems.reduce((sum, p) => sum + p.linkedIncidents, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/reports")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <AlertTriangle className="h-5 w-5 text-ink-subtle" />
          <h1 className="text-lg font-semibold text-ink">Problem Report</h1>
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
          <ProblemsSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16">
            <div className="rounded-pill bg-semantic-danger/10 p-4 mb-4">
              <AlertCircle className="h-8 w-8 text-semantic-danger" />
            </div>
            <h3 className="text-base font-medium text-ink mb-1">Failed to load problem report</h3>
            <p className="text-sm text-ink-subtle mb-4 max-w-xs">
              An error occurred while fetching problem report data.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16">
            <div className="rounded-pill bg-surface-2 p-4 mb-4">
              <Bug className="h-8 w-8 text-ink-muted" />
            </div>
            <h3 className="text-base font-medium text-ink mb-1">No problem data available</h3>
            <p className="text-sm text-ink-subtle mb-4 max-w-xs">
              No problem tickets or recurring patterns were found for the selected period.
            </p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="rounded-md bg-semantic-danger/10 p-2">
                    <Layers className="h-4 w-4 text-semantic-danger" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">Problem Tickets</p>
                    <p className="text-2xl font-semibold text-ink">{totalProblems}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="rounded-md bg-semantic-warning/10 p-2">
                    <TrendingUp className="h-4 w-4 text-semantic-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">Linked Incidents</p>
                    <p className="text-2xl font-semibold text-ink">{totalLinkedIncidents}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="rounded-md bg-semantic-success/10 p-2">
                    <FolderOpen className="h-4 w-4 text-semantic-success" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">Recurring Categories</p>
                    <p className="text-2xl font-semibold text-ink">{recurringCategories.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Recurring categories */}
            {recurringCategories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-ink">
                    Top Recurring Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-hairline">
                          <th className="text-left py-2 px-3 text-ink-subtle font-medium">Category</th>
                          <th className="text-right py-2 px-3 text-ink-subtle font-medium">Unlinked Incidents</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recurringCategories.map((cat) => (
                          <tr key={cat.categoryId} className="border-b border-hairline last:border-0">
                            <td className="py-2.5 px-3 text-ink">{cat.categoryName}</td>
                            <td className="py-2.5 px-3 text-right text-ink font-medium">
                              {cat.incidentCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Problem tickets table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-ink">
                  Problem Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                {problems.length === 0 ? (
                  <p className="text-sm text-ink-muted text-center py-8">No problem tickets found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-hairline">
                          <th className="text-left py-2 px-3 text-ink-subtle font-medium">Ticket</th>
                          <th className="text-left py-2 px-3 text-ink-subtle font-medium">Title</th>
                          <th className="text-left py-2 px-3 text-ink-subtle font-medium">Status</th>
                          <th className="text-left py-2 px-3 text-ink-subtle font-medium">Priority</th>
                          <th className="text-left py-2 px-3 text-ink-subtle font-medium">Client</th>
                          <th className="text-left py-2 px-3 text-ink-subtle font-medium">Agent</th>
                          <th className="text-right py-2 px-3 text-ink-subtle font-medium">Recurrence</th>
                          <th className="text-right py-2 px-3 text-ink-subtle font-medium">Incidents</th>
                          <th className="text-left py-2 px-3 text-ink-subtle font-medium">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {problems.map((p) => (
                          <tr key={p.id} className="border-b border-hairline last:border-0 hover:bg-surface-1/50">
                            <td className="py-2.5 px-3 text-ink font-mono text-xs">{p.ticketNumber}</td>
                            <td className="py-2.5 px-3 text-ink max-w-[200px] truncate">{p.title}</td>
                            <td className="py-2.5 px-3">
                              <Badge variant={statusVariant[p.status] as never ?? "secondary"}>
                                {p.status.replace("_", " ")}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge variant={priorityVariant[p.priority] as never ?? "secondary"}>
                                {p.priority}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-ink">{p.client}</td>
                            <td className="py-2.5 px-3 text-ink-muted">{p.assignedAgent ?? "—"}</td>
                            <td className="py-2.5 px-3 text-right text-ink">{p.recurrenceCount}</td>
                            <td className="py-2.5 px-3 text-right text-ink">{p.linkedIncidents}</td>
                            <td className="py-2.5 px-3 text-ink-muted text-xs">
                              {format(new Date(p.createdAt), "MMM d, yyyy")}
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
