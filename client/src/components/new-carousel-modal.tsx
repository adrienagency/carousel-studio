import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FORMAT_PRESETS } from "@/lib/format-presets";
import { generateSlidesFallback, generateFromTemplate, type GeneratorOptions } from "@/lib/slide-generator";
import { guestStorage } from "@/lib/guest-storage";
import type { Slide, GuestTemplate, GuestBrandKit } from "@/types/carousel";
import { Sparkles, Loader2, BookTemplate, FileText, Palette, Cpu } from "lucide-react";

const LLM_MODELS = [
  { id: "local", name: "Local (sans LLM)", description: "Parsing intelligent cote client" },
  { id: "claude_haiku_4_5", name: "Claude Haiku", description: "Rapide, economique" },
  { id: "claude_sonnet_4_6", name: "Claude Sonnet", description: "Equilibre qualite/vitesse" },
  { id: "gpt_5_1", name: "GPT-5.1", description: "OpenAI, performant" },
  { id: "gemini_3_flash", name: "Gemini Flash", description: "Google, rapide" },
];

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
  const [selectedBrandKit, setSelectedBrandKit] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("local");

  const templates = useMemo(() => guestStorage.getTemplates(), [open]);
  const brandKits = useMemo(() => guestStorage.getBrandKits(), [open]);

  const getWidth = () => isCustom ? customW : FORMAT_PRESETS.find((f) => f.id === selectedFormat)?.width || 1080;
  const getHeight = () => isCustom ? customH : FORMAT_PRESETS.find((f) => f.id === selectedFormat)?.height || 1080;
  const getPlatform = () => isCustom ? "custom" : FORMAT_PRESETS.find((f) => f.id === selectedFormat)?.platform || "linkedin";

  const getBrandKit = (): GuestBrandKit | null => {
    if (!selectedBrandKit) return null;
    return brandKits.find(k => k.id === selectedBrandKit) || null;
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);

    const w = getWidth();
    const h = getHeight();
    const kit = getBrandKit();
    let slides: Slide[];

    try {
      // Template-based generation
      if (selectedTemplate) {
        const tpl = templates.find((t) => t.id === selectedTemplate);
        if (tpl) {
          const templateSlides: Slide[] = JSON.parse(tpl.slides);
          slides = generateFromTemplate(text, templateSlides);
          const tplSettings = JSON.parse(tpl.settings || "{}");
          setIsGenerating(false);
          setText("");
          setSelectedTemplate(null);
          onCreate({
            title: slides[0]?.elements.find((e) => e.type === "text")?.content || tpl.name,
            slides,
            settings: { width: tplSettings.width || w, height: tplSettings.height || h, platform: tplSettings.platform || getPlatform() },
          });
          return;
        }
      }

      // LLM-based generation
      if (selectedModel !== "local") {
        try {
          const res = await fetch("./api/generate-slides", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              brandKit: kit,
              platform: getPlatform(),
              model: selectedModel,
              width: w,
              height: h,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.slides) {
              slides = data.slides;
              const firstText = slides[0]?.elements.find((e: any) => e.type === "text");
              setIsGenerating(false);
              setText("");
              onCreate({ title: firstText?.content || "Sans titre", slides, settings: { width: w, height: h, platform: getPlatform() } });
              return;
            }
          }
        } catch (e) {
          console.warn("LLM generation failed, falling back to local:", e);
        }
      }

      // Local fallback generation
      await new Promise((r) => setTimeout(r, 300));
      const genOptions: GeneratorOptions = { width: w, height: h };
      if (kit) {
        genOptions.primaryColor = kit.primaryColor;
        genOptions.secondaryColor = kit.secondaryColor;
        genOptions.accentColor = kit.accentColor;
        genOptions.backgroundColor = kit.backgroundColor;
        genOptions.headingFont = kit.headingFont;
        genOptions.bodyFont = kit.bodyFont;
      }
      slides = generateSlidesFallback(text, genOptions);
    } catch {
      slides = generateSlidesFallback(text, { width: w, height: h });
    }

    const firstText = slides[0]?.elements.find((e) => e.type === "text");
    setIsGenerating(false);
    setText("");
    onCreate({ title: firstText?.content || "Sans titre", slides, settings: { width: w, height: h, platform: getPlatform() } });
  };

  const handleCreateBlank = () => {
    onCreate({
      title: "Sans titre",
      slides: [{ id: crypto.randomUUID(), order: 0, type: "cover" as const, backgroundColor: "#FFFFFF", elements: [] }],
      settings: { width: getWidth(), height: getHeight(), platform: getPlatform() },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau carrousel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* FORMAT */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Format</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {FORMAT_PRESETS.map((preset) => {
                const isActive = !isCustom && selectedFormat === preset.id;
                const maxPrev = 32;
                const ratio = preset.width / preset.height;
                const prevW = ratio >= 1 ? maxPrev : Math.round(maxPrev * ratio);
                const prevH = ratio >= 1 ? Math.round(maxPrev / ratio) : maxPrev;
                return (
                  <button key={preset.id} type="button"
                    onClick={() => { setSelectedFormat(preset.id); setIsCustom(false); }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-center ${isActive ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                    data-testid={`format-${preset.id}`}
                  >
                    <div className={`rounded-sm ${isActive ? "bg-primary/20" : "bg-muted"}`} style={{ width: prevW, height: prevH }} />
                    <span className="text-[10px] font-medium leading-tight">{preset.name}</span>
                  </button>
                );
              })}
              <button type="button" onClick={() => setIsCustom(true)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${isCustom ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
              >
                <div className={`w-8 h-6 rounded-sm border-2 border-dashed ${isCustom ? "border-primary/40" : "border-muted-foreground/20"}`} />
                <span className="text-[10px] font-medium">Custom</span>
              </button>
            </div>
            {isCustom && (
              <div className="flex items-center gap-2 mt-2">
                <Input type="number" value={customW} onChange={(e) => setCustomW(Number(e.target.value) || 1080)} className="h-7 text-xs w-20" />
                <span className="text-xs text-muted-foreground">x</span>
                <Input type="number" value={customH} onChange={(e) => setCustomH(Number(e.target.value) || 1080)} className="h-7 text-xs w-20" />
              </div>
            )}
          </div>

          {/* BRAND KIT + MODEL — side by side */}
          <div className="grid grid-cols-2 gap-3">
            {/* Brand Kit */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Palette className="w-3 h-3" /> Charte graphique
              </Label>
              <Select value={selectedBrandKit || "none"} onValueChange={(v) => setSelectedBrandKit(v === "none" ? null : v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Aucune charte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune (defaut)</SelectItem>
                  {brandKits.map((kit) => (
                    <SelectItem key={kit.id} value={kit.id}>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: kit.primaryColor }} />
                        {kit.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* LLM Model */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Cpu className="w-3 h-3" /> Modele IA
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LLM_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex flex-col">
                        <span className="text-xs">{m.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* TEMPLATE */}
          {templates.length > 0 && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Template</Label>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button type="button" onClick={() => setSelectedTemplate(null)}
                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border-2 text-xs ${!selectedTemplate ? "border-primary bg-primary/5 font-medium" : "border-border"}`}
                >
                  <FileText className="w-3 h-3" /> Aucun
                </button>
                {templates.map((tpl) => (
                  <button key={tpl.id} type="button" onClick={() => setSelectedTemplate(tpl.id)}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border-2 text-xs ${selectedTemplate === tpl.id ? "border-primary bg-primary/5 font-medium" : "border-border"}`}
                  >
                    <BookTemplate className="w-3 h-3" /> {tpl.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TEXT */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Contenu</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Collez votre texte ici...\n\nExemple :\n5 strategies pour augmenter votre visibilite\n\n1. Publiez regulierement\n2. Utilisez les carrousels\n3. Engagez avec votre communaute"}
              className="min-h-[140px] text-sm"
              data-testid="input-carousel-text"
            />
          </div>

          {/* ACTIONS */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleCreateBlank} data-testid="button-create-blank">
              Carrousel vide
            </Button>
            <Button className="flex-1" onClick={handleGenerate} disabled={!text.trim() || isGenerating} data-testid="button-generate-carousel">
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generation...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />{selectedModel === "local" ? "Generer" : "Generer avec IA"}</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
