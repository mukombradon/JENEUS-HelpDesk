import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { toast } from "../../components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import api from "../../lib/api";
import type { Client } from "../../types";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CreateClientPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [contractTier, setContractTier] = useState("standard");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Client name is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [name]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setSubmitting(true);
      try {
        const payload: Record<string, unknown> = {
          name: name.trim(),
          contract_tier: contractTier,
        };
        if (industry) payload.industry = industry.trim();
        if (website) payload.website = website.trim();
        if (phone) payload.phone = phone.trim();
        if (email) payload.email = email.trim();
        if (address) payload.address = address.trim();
        if (notes) payload.notes = notes.trim();

        const { data } = await api.post<{ client: Client }>("/clients", payload);

        toast({
          title: "Client created",
          description: `${data.client.name} has been created successfully.`,
          variant: "success",
        });

        navigate(`/clients/${data.client.id}`);
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
            : "Failed to create client.";
        toast({
          title: "Error",
          description: message,
          variant: "error",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [validate, name, contractTier, industry, website, phone, email, address, notes, navigate],
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/clients")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-ink">New Client</h1>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 overflow-y-auto scrollbar-dark"
      >
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {/* Client Name */}
          <div>
            <Label className="mb-1.5 block text-sm text-ink">
              Client Name <span className="text-semantic-danger">*</span>
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="Acme Corp"
                className={errors.name ? "border-semantic-danger pl-9" : "pl-9"}
              />
            </div>
            {errors.name && (
              <p className="text-xs text-semantic-danger mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Industry */}
          <div>
            <Label className="mb-1.5 block text-sm text-ink">Industry</Label>
            <Input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Technology, Healthcare, Finance"
            />
          </div>

          {/* Website */}
          <div>
            <Label className="mb-1.5 block text-sm text-ink">Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://acme.com"
                className="pl-9"
              />
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block text-sm text-ink">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@acme.com"
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm text-ink">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <Label className="mb-1.5 block text-sm text-ink">Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-ink-subtle pointer-events-none" />
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, City, State, ZIP"
                className="pl-9 min-h-[60px]"
              />
            </div>
          </div>

          {/* Contract Tier */}
          <div>
            <Label className="mb-1.5 block text-sm text-ink">Contract Tier</Label>
            <Select value={contractTier} onValueChange={setContractTier}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enterprise">Enterprise</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label className="mb-1.5 block text-sm text-ink">Notes</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-ink-subtle pointer-events-none" />
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this client..."
                className="pl-9 min-h-[100px]"
              />
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="sticky bottom-0 border-t border-hairline bg-surface-1 px-6 py-3">
          <div className="flex items-center justify-end gap-3 max-w-2xl mx-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/clients")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Client"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
