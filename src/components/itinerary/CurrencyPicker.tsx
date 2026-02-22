import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "TWD", symbol: "NT$", name: "Taiwan Dollar" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
];

interface CurrencyPickerProps {
  value: string;
  onChange: (code: string) => void;
  compact?: boolean;
}

const CurrencyPicker = ({ value, onChange, compact = false }: CurrencyPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = CURRENCIES.find(c => c.code === value) || CURRENCIES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = CURRENCIES.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.symbol.includes(search)
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-xl bg-card border border-border transition-colors hover:bg-muted/50",
          compact ? "px-3 py-2.5 text-sm" : "px-4 py-3 text-sm"
        )}
      >
        <span className="font-medium text-foreground">{selected.code}</span>
        <span className="text-muted-foreground">{selected.symbol}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1 right-0 w-64 max-h-72 rounded-xl bg-card border border-border shadow-elevated overflow-hidden animate-fade-up"
          style={{ animationDuration: "150ms" }}
        >
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search currency..."
                className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-52">
            {filtered.map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onChange(c.code);
                  setIsOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50",
                  c.code === value && "bg-primary/5"
                )}
              >
                <span className="w-8 text-center text-sm font-medium text-muted-foreground">{c.symbol}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">{c.code}</span>
                  <span className="text-xs text-muted-foreground ml-2">{c.name}</span>
                </div>
                {c.code === value && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground text-center">No currencies found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyPicker;
