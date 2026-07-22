import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Search,
  Bug,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Card } from "../../components/ui/card";
import api from "../../lib/api";
import type { Ticket, TicketStatus, Priority, PaginatedResponse } from "../../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];
const STATUSES: TicketStatus[] = [
  "open",
  "in_progress",
  "pending",
  "resolved",
  "closed",
  "cancelled",
];

const PAGE_SIZE = 20;

type SortField = "ticket_number" | "priority" | "created_at" | "status";
type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusBadgeVariant: Record<string, string> = {
  open: "open",
  in_progress: "in-progress",
  pending: "pending",
  resolved: "resolved",
  closed: "closed",
  cancelled: "cancelled",
};

const priorityBadgeVariant: Record<string, string> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return format(new Date(dateStr), "MMM d, yyyy");
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ProblemsPage() {
  const navigate = useNavigate();

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Sort & pagination
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  // Debounce search
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      const timer = setTimeout(() => {
        setDebouncedSearch(value);
        setPage(1);
      }, 300);
      return () => clearTimeout(timer);
    },
    []
  );

  // Build query params
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    params.type = "problem";
    if (statusFilter !== "all") params.status = statusFilter;
    if (priorityFilter !== "all") params.priority = priorityFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    params.sort_by = sortField;
    params.sort_order = sortDir;
    params.page = String(page);
    params.limit = String(PAGE_SIZE);
    return params;
  }, [statusFilter, priorityFilter, debouncedSearch, sortField, sortDir, page]);

  // Fetch problems
  const {
    data: response,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["problems", "list", queryParams],
    queryFn: () =>
      api
        .get<PaginatedResponse<Ticket>>("/tickets", { params: queryParams })
        .then((r) => r.data),
  });

  const problems = response?.data ?? [];
  const totalPages = response?.totalPages ?? 1;
  const total = response?.total ?? 0;

  // Sort handler
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
      setPage(1);
    },
    [sortField]
  );

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  // Pagination range
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  const hasActiveFilters = statusFilter !== "all" || priorityFilter !== "all" || debouncedSearch !== "";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-semantic-danger" />
          <h1 className="text-lg font-semibold text-ink">Problems</h1>
          {!isLoading && (
            <span className="text-sm text-ink-subtle">{total} total</span>
          )}
        </div>
        <Button size="sm" onClick={() => navigate("/problems/new")}>
          <Plus className="h-4 w-4 mr-1" />
          New Problem
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-hairline flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <Input
            placeholder="Search problems..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setPriorityFilter("all");
              setSearchQuery("");
              setDebouncedSearch("");
              setPage(1);
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-dark">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16">
            <div className="rounded-pill bg-semantic-danger/10 p-4 mb-4">
              <AlertCircle className="h-8 w-8 text-semantic-danger" />
            </div>
            <h3 className="text-base font-medium text-ink mb-1">Failed to load problems</h3>
            <p className="text-sm text-ink-subtle mb-4 max-w-xs">
              An error occurred while fetching problem tickets.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        ) : problems.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16">
            <div className="rounded-pill bg-surface-2 p-4 mb-4">
              <Bug className="h-8 w-8 text-ink-muted" />
            </div>
            <h3 className="text-base font-medium text-ink mb-1">No problems found</h3>
            <p className="text-sm text-ink-subtle mb-4 max-w-xs">
              {hasActiveFilters
                ? "No problems match the current filters."
                : "There are no problem tickets yet. Create your first problem to track root causes."}
            </p>
            {!hasActiveFilters && (
              <Button size="sm" onClick={() => navigate("/problems/new")}>
                <Plus className="h-4 w-4 mr-1" />
                Create Problem
              </Button>
            )}
          </div>
        ) : (
          <div className="p-6">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hairline bg-surface-1">
                      <th
                        className="text-left py-3 px-4 text-ink-subtle font-medium cursor-pointer hover:text-ink select-none"
                        onClick={() => handleSort("ticket_number")}
                      >
                        Ticket #{sortIcon("ticket_number")}
                      </th>
                      <th className="text-left py-3 px-4 text-ink-subtle font-medium">
                        Title
                      </th>
                      <th
                        className="text-left py-3 px-4 text-ink-subtle font-medium cursor-pointer hover:text-ink select-none"
                        onClick={() => handleSort("priority")}
                      >
                        Priority{sortIcon("priority")}
                      </th>
                      <th
                        className="text-left py-3 px-4 text-ink-subtle font-medium cursor-pointer hover:text-ink select-none"
                        onClick={() => handleSort("status")}
                      >
                        Status{sortIcon("status")}
                      </th>
                      <th className="text-left py-3 px-4 text-ink-subtle font-medium">
                        Assigned To
                      </th>
                      <th
                        className="text-left py-3 px-4 text-ink-subtle font-medium cursor-pointer hover:text-ink select-none"
                        onClick={() => handleSort("created_at")}
                      >
                        Created{sortIcon("created_at")}
                      </th>
                      <th className="text-left py-3 px-4 text-ink-subtle font-medium">
                        SLA Due
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {problems.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="border-b border-hairline last:border-0 hover:bg-surface-1/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/problems/${ticket.id}`)}
                      >
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs text-primary font-medium">
                            {ticket.ticket_number}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-[300px]">
                          <span className="text-ink font-medium truncate block">
                            {ticket.title}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={priorityBadgeVariant[ticket.priority] as never ?? "secondary"}>
                            {ticket.priority}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={statusBadgeVariant[ticket.status] as never ?? "secondary"}>
                            {ticket.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-ink-muted">
                          {ticket.assigned_agent_id ?? "—"}
                        </td>
                        <td className="py-3 px-4 text-ink-muted text-xs">
                          {formatDate(ticket.created_at)}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {ticket.resolution_due_at ? (
                            <span
                              className={
                                ticket.sla_breach
                                  ? "text-semantic-danger font-medium"
                                  : "text-ink-muted"
                              }
                            >
                              {formatDate(ticket.resolution_due_at)}
                            </span>
                          ) : (
                            <span className="text-ink-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-ink-muted">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {pageNumbers.map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "ghost"}
                    size="sm"
                    className="min-w-[32px]"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
