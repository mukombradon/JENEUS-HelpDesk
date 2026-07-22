import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  BarChart3,
  ArrowLeft,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  FileText,
  Bug,
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
import api from "../../lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VolumePeriod {
  date: string;
  total: number;
  incidents: number;
  problems: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
}

interface VolumeTotals {
  total: number;
  incidents: number;
  problems: number;
}

interface VolumeReportData {
  period: string;
  volumeByPeriod: VolumePeriod[];
  totals: VolumeTotals;
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

const PERIOD_OPTIONS = [
  { label: "Daily", value: "day" },
  { label: "Weekly", value: "week" },
  { label: "Monthly", value: "month" },
];

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function VolumeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini bar
// ---------------------------------------------------------------------------

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-24 h-2 bg-surface-3 rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function VolumePage() {
  const navigate = useNavigate();
  const [datePreset, setDatePreset] = useState("30d");
  const [period, setPeriod] = useState("day");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const getDateParams = () => {
    if (datePreset === "custom") {
      return { dateFrom: startDate, dateTo: endDate, period };
    }
    const now = new Date();
    let start: Date;
    switch (datePreset) {
      case "7d": start = subDays(now, 7); break;
      case "90d": start = subDays(now, 90); break;
      default: start = subDays(now, 30);
    }
    return { dateFrom: format(start, "yyyy-MM-dd"), dateTo: format(now, "yyyy-MM-dd"), period };
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["report-volume", datePreset, period, startDate, endDate],
    queryFn: () =>
      api.get<VolumeReportData>("/reports/volume", { params: getDateParams() }).then((r) => r.data),
  });

  const volumeByPeriod = data?.volumeByPeriod ?? [];
  const totals = data?.totals;
  const maxCount = Math.max(...volumeByPeriod.map((p) => p.total), 1);

  const hasData = totals && totals.total > 0;

  // Aggregate category totals across all periods
  const categoryTotals: Record<string, number> = {};
  for (const p of volumeByPeriod) {
    for (const [cat, count] of Object.entries(p.byCategory)) {
      categoryTotals[cat] = (categoryTotals[cat] || 0) + count;
    }
  }
  const sortedCategories = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/reports")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <BarChart3 className="h-5 w-5 text-ink-subtle" />
          <h1 className="text-lg font-semibold text-ink">Volume Report</h1>
        </div>
      </div>

      {/* Filters */}
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
        <Separator orientation="vertical" className="h-6" />
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-dark p-6 space-y-6">
        {isLoading ? (
          <VolumeSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16">
            <div className="rounded-pill bg-semantic-danger/10 p-4 mb-4">
              <AlertCircle className="h-8 w-8 text-semantic-danger" />
            </div>
            <h3 className="text-base font-medium text-ink mb-1">Failed to load volume report</h3>
            <p className="text-sm text-ink-subtle mb-4 max-w-xs">
              An error occurred while fetching volume report data.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16">
            <div className="rounded-pill bg-surface-2 p-4 mb-4">
              <TrendingUp className="h-8 w-8 text-ink-muted" />
            </div>
            <h3 className="text-base font-medium text-ink mb-1">No volume data available</h3>
            <p className="text-sm text-ink-subtle mb-4 max-w-xs">
              No tickets were found for the selected period.
            </p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="rounded-md bg-primary/10 p-2">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">Total Tickets</p>
                    <p className="text-2xl font-semibold text-ink">{totals!.total}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="rounded-md bg-semantic-warning/10 p-2">
                    <Bug className="h-4 w-4 text-semantic-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">Incidents</p>
                    <p className="text-2xl font-semibold text-ink">{totals!.incidents}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="rounded-md bg-semantic-danger/10 p-2">
                    <Layers className="h-4 w-4 text-semantic-danger" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">Problems</p>
                    <p className="text-2xl font-semibold text-ink">{totals!.problems}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Volume breakdown by period */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-ink">
                  Ticket Volume by {period.charAt(0).toUpperCase() + period.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {volumeByPeriod.length === 0 ? (
                  <p className="text-sm text-ink-muted text-center py-8">No period data available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-hairline">
                          <th className="text-left py-2 px-3 text-ink-subtle font-medium">Period</th>
                          <th className="text-right py-2 px-3 text-ink-subtle font-medium">Total</th>
                          <th className="text-right py-2 px-3 text-ink-subtle font-medium">Incidents</th>
                          <th className="text-right py-2 px-3 text-ink-subtle font-medium">Problems</th>
                          <th className="text-left py-2 px-3 text-ink-subtle font-medium">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {volumeByPeriod.map((p) => (
                          <tr key={p.date} className="border-b border-hairline last:border-0">
                            <td className="py-2.5 px-3 text-ink font-medium">{p.date}</td>
                            <td className="py-2.5 px-3 text-right text-ink">{p.total}</td>
                            <td className="py-2.5 px-3 text-right text-ink">{p.incidents}</td>
                            <td className="py-2.5 px-3 text-right text-ink">{p.problems}</td>
                            <td className="py-2.5 px-3">
                              <MiniBar value={p.total} max={maxCount} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* By Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-ink">
                  Volume by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sortedCategories.length === 0 ? (
                  <p className="text-sm text-ink-muted text-center py-8">No category data available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-hairline">
                          <th className="text-left py-2 px-3 text-ink-subtle font-medium">Category</th>
                          <th className="text-right py-2 px-3 text-ink-subtle font-medium">Tickets</th>
                          <th className="text-right py-2 px-3 text-ink-subtle font-medium">% of Total</th>
                          <th className="text-left py-2 px-3 text-ink-subtle font-medium">Distribution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCategories.map(([name, count]) => (
                          <tr key={name} className="border-b border-hairline last:border-0">
                            <td className="py-2.5 px-3 text-ink">{name}</td>
                            <td className="py-2.5 px-3 text-right text-ink">{count}</td>
                            <td className="py-2.5 px-3 text-right text-ink">
                              {Math.round((count / totals!.total) * 100)}%
                            </td>
                            <td className="py-2.5 px-3">
                              <MiniBar value={count} max={sortedCategories[0]![1]} />
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
