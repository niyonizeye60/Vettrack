"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { Check, Loader2, Plus, Search } from "lucide-react"

interface SearchComboboxProps {
  /** Current value — also doubles as the search query while typing. */
  value: string
  /** Called on every keystroke so the field follows the typed text. */
  onValueChange: (v: string) => void
  /** Called when a suggestion is picked or a create action is confirmed. */
  onCommit: (v: string) => void
  /** Suggestion list (filtered client-side, case-insensitive). */
  items: string[]
  placeholder: string
  searchPlaceholder: string
  emptyHint: string
  error?: boolean
  /** When provided (and the typed value is not in items) show a create action. */
  createLabel?: (query: string) => string
  onCreate?: (query: string) => Promise<void> | void
  createBusy?: boolean
  /** Optional second create action (e.g. admin-only "save as category"). */
  secondaryCreateLabel?: (query: string) => string
  secondaryOnCreate?: (query: string) => Promise<void> | void
  secondaryCreateBusy?: boolean
}

export default function SearchCombobox({
  value,
  onValueChange,
  onCommit,
  items,
  placeholder,
  searchPlaceholder,
  emptyHint,
  error,
  createLabel,
  onCreate,
  createBusy = false,
  secondaryCreateLabel,
  secondaryOnCreate,
  secondaryCreateBusy = false,
}: SearchComboboxProps) {
  const [open, setOpen] = useState(false)

  const q = value.trim().toLowerCase()
  const matches = items.filter((i) => i.toLowerCase().includes(q))
  const exactMatch = matches.some((i) => i.toLowerCase() === q)
  const canCreate = q.length > 0 && !exactMatch && !!createLabel && !!onCreate

  const runCreate = async () => {
    await onCreate?.(value.trim())
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-start gap-2 font-normal h-10 text-left",
            error ? "border-red-500 text-red-600" : "text-foreground"
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          {value ? (
            <span className="flex-1 min-w-0 truncate">{value}</span>
          ) : (
            <span className="flex-1 min-w-0 text-muted-foreground font-normal truncate">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
        <Command shouldFilter={false}>
          <CommandInput
            autoFocus
            placeholder={searchPlaceholder}
            value={value}
            onValueChange={onValueChange}
            onKeyDown={(e) => {
              // Only intercept Enter when there are no matches to select —
              // otherwise let cmdk's own selection win so a highlighted item
              // is never overridden by the raw typed text.
              if (e.key === "Enter" && matches.length === 0 && value.trim()) {
                e.preventDefault()
                onCommit(value.trim())
                setOpen(false)
              }
            }}
          />
          <CommandList>
            {matches.length > 0 && (
              <CommandGroup>
                {matches.map((m) => (
                  <CommandItem key={m} value={m} onSelect={() => { onCommit(m); setOpen(false) }}>
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value.toLowerCase() === m.toLowerCase() ? "opacity-100 text-green-600" : "opacity-0"
                      )}
                    />
                    {m}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {canCreate && (
              <>
                {matches.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Not found — add new">
                  <CommandItem value={value} onSelect={runCreate} disabled={createBusy} className="gap-2 text-green-700">
                    {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {createLabel(value.trim())}
                  </CommandItem>
                  {secondaryCreateLabel && secondaryOnCreate && (
                    <CommandItem
                      value={value}
                      onSelect={async () => { await secondaryOnCreate?.(value.trim()); setOpen(false) }}
                      disabled={secondaryCreateBusy}
                      className="gap-2 text-green-700"
                    >
                      {secondaryCreateBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {secondaryCreateLabel(value.trim())}
                    </CommandItem>
                  )}
                </CommandGroup>
              </>
            )}
            {matches.length === 0 && !canCreate && (
              <div className="py-6 text-center text-sm text-gray-400">{emptyHint}</div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
