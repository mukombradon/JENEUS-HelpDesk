import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  Tag,
  BookOpen,
  AlertCircle,
  Loader2,
  Globe,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "../../components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import api from "../../lib/api";
import type { KnowledgeArticle } from "../../types";

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function EditFormSkeleton() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-6 w-48" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch article
  const {
    data: article,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["kb", "article", id],
    queryFn: () =>
      api
        .get<{ article: KnowledgeArticle }>(`/kb/articles/${id}`)
        .then((r) => r.data.article),
    enabled: !!id,
  });

  // Fetch categories for the dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      api
        .get<{ data: { id: string; name: string }[] }>("/categories")
        .then((r) => r.data.data ?? []),
  });

  // Pre-fill form once article data is loaded
  useEffect(() => {
    if (article && !initialized) {
      setTitle(article.title || "");
      setBody(article.body || "");
      setCategoryId(article.category_id || "");
      setTags(Array.isArray(article.tags) ? article.tags.join(", ") : "");
      setIsPublished(article.is_published ?? false);
      setInitialized(true);
    }
  }, [article, initialized]);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Title is required";
    if (!body.trim()) errs.body = "Article body is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [title, body]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setSubmitting(true);
      try {
        const tagsArray = tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

        const payload: Record<string, unknown> = {
          title: title.trim(),
          body: body.trim(),
          isPublished,
        };
        if (categoryId) payload.categoryId = categoryId;
        if (tagsArray.length > 0) payload.tags = tagsArray;

        await api.patch(`/kb/articles/${id}`, payload);

        toast({
          title: "Article updated",
          description: "Your changes have been saved.",
          variant: "success",
        });

        queryClient.invalidateQueries({ queryKey: ["kb", "article", id] });
        queryClient.invalidateQueries({ queryKey: ["kb", "articles"] });

        navigate(`/knowledge-base/${id}`);
      } catch (err: unknown) {
        const message =
          err instanceof Object &&
          "response" in err &&
          err.response instanceof Object &&
          "data" in err.response &&
          typeof err.response.data === "object" &&
          err.response.data !== null &&
          "message" in err.response.data
            ? String((err.response.data as { message: string }).message)
            : "Failed to update article.";
        toast({
          title: "Error",
          description: message,
          variant: "error",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [validate, title, body, categoryId, tags, isPublished, id, navigate, queryClient],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-hairline">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-dark">
          <EditFormSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !article) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-24">
        <div className="rounded-pill bg-surface-3 p-4 mb-4">
          <AlertCircle className="h-8 w-8 text-semantic-danger" />
        </div>
        <h2 className="text-lg font-semibold text-ink mb-1">
          Article not found
        </h2>
        <p className="text-sm text-ink-subtle mb-6 max-w-sm">
          The article you're trying to edit doesn't exist or has been removed.
        </p>
        <Button variant="outline" onClick={() => navigate("/knowledge-base")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Knowledge Base
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/knowledge-base/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-ink truncate max-w-md">
            Edit: {article.title}
          </h1>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 overflow-y-auto scrollbar-dark"
      >
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <Label className="mb-1.5 block text-sm text-ink">
              Title <span className="text-semantic-danger">*</span>
            </Label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
                }}
                placeholder="Article title"
                className={errors.title ? "border-semantic-danger pl-9" : "pl-9"}
              />
            </div>
            {errors.title && (
              <p className="text-xs text-semantic-danger mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <Label className="mb-1.5 block text-sm text-ink">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="No category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Body (content) */}
          <div>
            <Label className="mb-1.5 block text-sm text-ink">
              Article Body <span className="text-semantic-danger">*</span>
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-ink-subtle pointer-events-none" />
              <Textarea
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  if (errors.body) setErrors((prev) => ({ ...prev, body: "" }));
                }}
                placeholder="Write your article content here. HTML is supported."
                className={
                  errors.body
                    ? "border-semantic-danger pl-9 min-h-[300px] font-mono text-sm"
                    : "pl-9 min-h-[300px] font-mono text-sm"
                }
              />
            </div>
            {errors.body && (
              <p className="text-xs text-semantic-danger mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.body}
              </p>
            )}
          </div>

          {/* Tags */}
          <div>
            <Label className="mb-1.5 block text-sm text-ink">Tags</Label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="password, security, account"
                className="pl-9"
              />
            </div>
            <p className="text-xs text-ink-subtle mt-1">
              Separate tags with commas.
            </p>
          </div>

          {/* Published toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="cursor-pointer">Published</Label>
              <p className="text-xs text-ink-subtle">
                If disabled, only admins can view this article.
              </p>
            </div>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>
        </div>

        {/* Bottom actions */}
        <div className="sticky bottom-0 border-t border-hairline bg-surface-1 px-6 py-3">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <p className="text-xs text-ink-subtle">
              {isPublished ? (
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Visible to all agents
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  Draft — only admins can see it
                </span>
              )}
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate(`/knowledge-base/${id}`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
