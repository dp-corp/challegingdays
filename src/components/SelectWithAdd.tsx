import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  onAdd?: (option: SelectOption) => void;
  placeholder?: string;
  addLabel?: string;
  className?: string;
}

export function SelectWithAdd({
  value,
  onChange,
  options,
  onAdd,
  placeholder,
  addLabel = "Add new…",
  className,
}: Props) {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  const commit = () => {
    const label = draft.trim();
    if (!label) return;
    const val = label.toLowerCase().replace(/\s+/g, "_").slice(0, 40);
    const opt = { value: val, label };
    onAdd?.(opt);
    onChange(val);
    setDraft("");
    setAdding(false);
  };

  if (adding) {
    return (
      <div className={`flex gap-2 ${className ?? ""}`}>
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="New option…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") setAdding(false);
          }}
        />
        <Button type="button" size="icon" onClick={commit}>
          <Check className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v === "__add__") {
          setAdding(true);
          return;
        }
        onChange(v);
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
        {onAdd && (
          <SelectItem value="__add__" className="text-primary">
            <span className="flex items-center gap-2">
              <Plus className="size-3.5" />
              {addLabel}
            </span>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
