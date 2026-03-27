import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FORMAT_PRESETS } from "@/lib/format-presets";
import { generateSlidesFallback, generateFromTemplate } from "@/lib/slide-generator";
import { guestStorage } from "@/lib/guest-storage";
import type { Slide, GuestTemplate } from "@/types/carousel";
import { Sparkles, Loader2, Monitor, Smartphone, Layout, BookTemplate, FileText } from "lucide-react";

interface NewCarouselModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    slides: Slide[];
    settings: { width: number; height: number; platform: string };
  }) => void;
}

export function NewCarouselModal({ open, onClose, onCreate }: NewCarouselModalProps) {
  const [text, setText] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("li-doc");
  const [customW, setCustomW] = useState(1080);
  const [customH, setCustomH] = useState(1080);
  const [isCustom, setIsCustom] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const templates = useMemo(() => guestStorage.getTemplates(), [open]);

  const getWidth = () => {
    if (isCustom) return customW;
    return FORMAT_PRESETS.find((f) => f.id === selectedFormat)?.width || 1080;
  };
  const getHeight = () => {
    if (isCustom) return customH;
    return FORMAT_PRESETS.find((f) => f.id === selectedFormat)?.height || 1080;
  };
  const getPlatform = () => {
    if (isCustom) return "custom";
    return FORMAT_PRESETS.find((f) => f.id === selectedFormat)?.platform || "linkedin";
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 400));

    const w = getWidth();
    const h = getHeight();
    let slides: Slide[];

    // If a template is selected, generate from template
    if (selectedTemplate) {
      const tpl = templates.find((t) => t.id === selectedTemplate);
      if (tpl) {
        try {
          const templateSlides: Slide[] = JSON.parse(tpl.slides);
          slides = generateFromTemplate(text, templateSlides);
          // Use template settings if available
          try {
            const tplSettings = JSON.parse(tpl.settings);
            if (tplSettings.width && tplSettings.height) {
              setIsGenerating(false);
              setText("");
              setSelectedTemplate(null);
              onCreate({
                title: slides[0]?.elements.find((e) => e.type === "text")?.content || tpl.name,
                slides,
                settings: { width: tplSettings.width, height: tplSettings.height, platform: tplSettings.platform || getPlatform() },
              });
              return;
            }
          } catch {}
        } catch {
          // Fallback to normal generation if template parsing fails
          slides = generateSlidesFallback(text, { width: w, height: h });
        }
      } else {
        slides = generateSlidesFallback(text, { width: w, height: h });
      }
    } else {
      slides = generateSlidesFallback(text, { width: w, height: h });
    }

    const firstTextEl = slides[0]?.elements.find((e) => e.type === "text");
    const title = firstTextEl?.content || "Sans titre";

    setIsGenerating(false);
    setText("");
    setSelectedTemplate(null);

    onCreate({ title, slides, settings: { width: w, height: h, platform: getPlatform() } });
  };

  const handleCreateBlank = () => {
    onCreate({
      title: "Sans titre",
      slides: [{
        id: crypto.randomUUID(), order: 0, type: "cover" as const,
        backgroundColor: "#FFFFFF", elements: [],
      }],
      settings: { width: getWidth(), height: getHeight(), platform: getPlatform() },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau carrousel</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* FORMAT */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">Format</Label>
            <div className="grid grid-cols-4 gap-2">
              {FORMAT_PRESETS.map((preset) => {
                const isActive = !isCustom && selectedFormat === preset.id;
                const maxPrev = 36;
                const ratio = preset.width / preset.height;
                const prevW = ratio >= 1 ? maxPrev : Math.round(maxPrev * ratio);
                const prevH = ratio >= 1 ? Math.round(maxPrev / ratio) : maxPrev;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => { setSelectedFormat(preset.id); setIsCustom(false); }}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all text-center ${
                      isActive ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                    }`}
                    data-testid={`format-${preset.id}`}
                  >
                    <div className={`rounded-sm ${isActive ? "bg-primary/20" : "bg-muted"}`} style={{ width: prevW, height: prevH }} />
                    <span className="text-[10px] font-medium leading-tight">{preset.name}</span>
                    <span className="text-[9px] text-muted-foreground">{preset.width}x{preset.height}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all text-center ${
                  isCustom ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className={`w-[36px] h-[28px] rounded-sm border-2 border-dashed ${isCustom ? "border-primary/40" : "border-muted-foreground/20"}`} />
                <span className="text-[10px] font-medium">Custom</span>
              </button>
            </div>
            {isCustom && (
              <div className="flex items-center gap-2 mt-3">
                <Input type="number" value={customW} onChange={(e) => setCustomW(Number(e.target.value) || 1080)} className="h-8 text-xs w-24" min={200} max={4000} />
                <span className="text-xs text-muted-foreground">x</span>
                <Input type="number" value={customH} onChange={(e) => setCustomH(Number(e.target.value) || 1080)} className="h-8 text-xs w-24" min={200} max={4000} />
                <span className="text-xs text-muted-foreground">px</span>
              </div>
            )}
          </div>

          {/* TEMPLATE SELECTOR (if templates exist) */}
          {templates.length > 0 && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Template (optionnel)
              </Label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-xs ${
                    !selectedTemplate ? "border-primary bg-primary/5 font-medium" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Aucun
                </button>
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-xs ${
                      selectedTemplate === tpl.id ? "border-primary bg-primary/5 font-medium" : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <BookTemplate className="w-3.5 h-3.5" />
                    {tpl.name}
                  </button>
                ))}
              </div>
              {selectedTemplate && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Le texte sera adapte a la structure du template selectionne.
                </p>
              )}
            </div>
          )}

          {/* TEXT */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Contenu {selectedTemplate ? "(requis)" : "(optionnel)"}
            </Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={selectedTemplate
                ? "Collez votre texte ici. Le contenu sera adapte a la structure du template selectionne..."
                : "Collez votre texte ici pour generer automatiquement les slides...\n\nExemple :\n5 strategies pour augmenter votre visibilite\n\n1. Publiez regulierement\nLa constance est la cle.\n\n2. Utilisez les carrousels\n3x plus d'engagement."}
              className="min-h-[160px] text-sm"
              data-testid="input-carousel-text"
            />
          </div>

          {/* ACTIONS */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleCreateBlank} data-testid="button-create-blank">
              Carrousel vide
            </Button>
            <Button
              className="flex-1"
              onClick={handleGenerate}
              disabled={!text.trim() || isGenerating}
              data-testid="button-generate-carousel"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generation...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />{selectedTemplate ? "Generer depuis template" : "Generer le carrousel"}</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
