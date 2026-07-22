import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Tag,
  BookOpen,
  AlertCircle,
  Globe,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
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
// Main component
// ---------------------------------------------------------------------------

export default function CreateArticlePage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch categories for the dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      api
        .get<{ data: { id: string; name: string }[] }>("/categories")
        .then((r) => r.data.data ?? []),
  });

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
          categoryId: categoryId || undefined,
          tags: tagsArray,
          isPublished,
        };

        const { data } = await api.post<{ article: KnowledgeArticle }>(
          "/kb/articles",
          payload,
        );

        toast({
          title: isPublished ? "Article published" : "Draft saved",
          description: `${data.article.title} has been created successfully.`,
          variant: "success",
        });

        navigate(`/knowledge-base/${data.article.id}`);
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
            : "Failed to create article.";
        toast({
          title: "Error",
          description: message,
          variant: "error",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [validate, title, body, categoryId, tags, isPublished, navigate],
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/knowledge-base")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-ink">New Article</h1>
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
                placeholder="How to reset your password"
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
                <SelectValue placeholder="Select a category..." />
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
            <p className="text-xs text-ink-subtle mt-1">
              HTML formatting is supported. Wrap headings in &lt;h1&gt;-&lt;h3&gt;, paragraphs in &lt;p&gt;, etc.
            </p>
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
              <Label className="cursor-pointer">Publish immediately</Label>
              <p className="text-xs text-ink-subtle">
                If disabled, the article will be saved as a draft.
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
                  Will be visible to all agents
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  Saved as draft — only admins can see it
                </span>
              )}
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/knowledge-base")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : isPublished ? "Publish" : "Save Draft"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
