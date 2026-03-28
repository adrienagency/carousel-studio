import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown, Loader2, Search } from "lucide-react";

// Popular fonts to show before any search
const POPULAR_FONTS = [
  "Inter", "Roboto", "Open Sans", "Montserrat", "Poppins", "Lato",
  "Oswald", "Raleway", "Playfair Display", "Merriweather",
  "Nunito", "DM Sans", "Space Grotesk", "Clash Display",
  "Satoshi", "General Sans", "Cabinet Grotesk",
  "Source Sans 3", "Work Sans", "Outfit", "Plus Jakarta Sans",
  "Barlow", "Archivo", "Sora", "Manrope",
];

interface FontPickerProps {
  value: string;
  onChange: (fontFamily: string) => void;
  className?: string;
}

// Cache loaded font stylesheets
const loadedFonts = new Set<string>();

function loadGoogleFont(fontFamily: string) {
  if (loadedFonts.has(fontFamily)) return;
  loadedFonts.add(fontFamily);
  
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

export function FontPicker({ value, onChange, className }: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [apiFonts, setApiFonts] = useState<string[]>([]);
  const [apiFontsLoaded, setApiFontsLoaded] = useState(false);

  // Load current font for preview
  useEffect(() => {
    if (value) loadGoogleFont(value);
  }, [value]);

  // Load full list from API on first open
  useEffect(() => {
    if (open && !apiFontsLoaded) {
      fetch("./api/google-fonts").then(r => r.json()).then(data => {
        if (data.fonts?.length) setApiFonts(data.fonts);
        setApiFontsLoaded(true);
      }).catch(() => setApiFontsLoaded(true));
    }
  }, [open, apiFontsLoaded]);

  // Filtered popular fonts (use API list if available)
  const baseFonts = apiFonts.length > 0 ? apiFonts : POPULAR_FONTS;
  const filteredPopular = useMemo(() => {
    if (!search.trim()) return baseFonts;
    const q = search.toLowerCase();
    return baseFonts.filter(f => f.toLowerCase().includes(q));
  }, [search, baseFonts]);

  // Search Google Fonts API with debounce
  useEffect(() => {
    if (!search.trim() || search.length < 2) {
      setSearchResults([]);
      return;
    }
    
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`./api/google-fonts?q=${encodeURIComponent(search)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.fonts || []);
          // Preload first 5 results for preview
          (data.fonts || []).slice(0, 5).forEach((f: string) => loadGoogleFont(f));
        }
      } catch {
        // ignore
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  const displayFonts = search.trim().length >= 2 && searchResults.length > 0
    ? searchResults
    : filteredPopular;

  const handleSelect = (font: string) => {
    loadGoogleFont(font);
    onChange(font);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={`h-8 text-xs justify-between w-full ${className || ""}`}
          data-testid="font-picker-trigger"
        >
          <span style={{ fontFamily: value || "Inter" }} className="truncate">
            {value || "Inter"}
          </span>
          <ChevronDown className="w-3 h-3 ml-1 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="flex items-center border-b px-2">
          <Search className="w-3.5 h-3.5 text-muted-foreground mr-1.5" />
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une police..."
            className="h-8 text-xs border-0 focus-visible:ring-0 px-0"
            data-testid="font-search-input"
          />
          {isSearching && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        </div>
        <ScrollArea className="h-60">
          <div className="p-1">
            {displayFonts.map((font) => {
              // Preload on hover for smoother preview
              return (
                <button
                  key={font}
                  className={`w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-accent transition-colors ${
                    font === value ? "bg-accent font-medium" : ""
                  }`}
                  style={{ fontFamily: font }}
                  onClick={() => handleSelect(font)}
                  onMouseEnter={() => loadGoogleFont(font)}
                  data-testid={`font-option-${font.replace(/\s/g, "-")}`}
                >
                  {font}
                </button>
              );
            })}
            {displayFonts.length === 0 && !isSearching && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Aucune police trouvee
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
