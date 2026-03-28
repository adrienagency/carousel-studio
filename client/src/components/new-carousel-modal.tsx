import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { FORMAT_PRESETS } from "@/lib/format-presets";
import { generateSlidesFallback, generateFromTemplate, type GeneratorOptions } from "@/lib/slide-generator";
import { guestStorage } from "@/lib/guest-storage";
import type { Slide, GuestTemplate, GuestBrandKit, SlideElement } from "@/types/carousel";
import { Sparkles, Loader2, BookTemplate, FileText, Palette, Cpu, Upload, User, Type as TypeIcon, Image as ImageIcon, X, Plus } from "lucide-react";

const LLM_MODELS = [
  { id: "local", name: "Local (sans LLM)", description: "Parsing intelligent cote client" },
  { id: "claude_haiku_4_5", name: "Claude Haiku", description: "Rapide, economique" },
  { id: "claude_sonnet_4_6", name: "Claude Sonnet", description: "Equilibre qualite/vitesse" },
  { id: "claude_opus_4_6", name: "Claude Opus", description: "Qualite maximale" },
  { id: "claude_opus_4_6_thinking", name: "Claude Opus (Thinking)", description: "Reflexion approfondie" },
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

function getContrastColor(bgHex: string): string {
  const hex = bgHex.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16) || 0;
  const g = parseInt(hex.substr(2, 2), 16) || 0;
  const b = parseInt(hex.substr(4, 2), 16) || 0;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? "#1A1A2E" : "#FFFFFF";
}

function injectOverlays(
  slides: Slide[],
  opts: {
    author?: { name: string; role: string; photo: string | null; fontSize: number };
    topline?: { text: string; fontSize: number };
    decoImages?: { dataUrl: string }[];
    infoImages?: { dataUrl: string }[];
    width: number;
    height: number;
  }
): Slide[] {
  // Clone slides
  const result = slides.map((s) => ({ ...s, elements: [...s.elements] }));

  // Inject topline on ALL slides (top-left, 24px from edges)
  if (opts.topline?.text) {
    result.forEach((slide) => {
      const contrastColor = getContrastColor(slide.backgroundColor || "#FFFFFF");
      slide.elements.push({
        id: crypto.randomUUID(),
        type: "text",
        x: 24,
        y: 24,
        width: opts.width - 48,
        height: 30,
        rotation: 0,
        locked: true,
        visible: true,
        zIndex: 100,
        style: {
          fontSize: opts.topline!.fontSize,
          fontWeight: 600,
          fontFamily: "Inter",
          color: contrastColor,
          textAlign: "left",
          textAutoHeight: true,
          letterSpacing: 0.1,
          lineHeight: 1.2,
        },
        content: opts.topline!.text.toUpperCase(),
      } as SlideElement);
    });
  }

  // Inject author on cover (first) and end (last) slides
  if (opts.author?.name) {
    const coverIdx = 0;
    const endIdx = result.length - 1;
    const indices = coverIdx === endIdx ? [coverIdx] : [coverIdx, endIdx];

    indices.forEach((idx) => {
      const slide = result[idx];
      const contrastColor = getContrastColor(slide.backgroundColor || "#FFFFFF");
      const xOffset = opts.author!.photo ? 68 : 24;

      // Author name + role text
      slide.elements.push({
        id: crypto.randomUUID(),
        type: "text",
        x: xOffset,
        y: opts.height - 24 - 40,
        width: 400,
        height: 40,
        rotation: 0,
        locked: true,
        visible: true,
        zIndex: 100,
        style: {
          fontSize: opts.author!.fontSize,
          fontWeight: 600,
          fontFamily: "Inter",
          color: contrastColor,
          textAlign: "left",
          lineHeight: 1.3,
          textAutoHeight: true,
        },
        content: `${opts.author!.name}\n${opts.author!.role}`,
      } as SlideElement);

      // Author photo (if provided)
      if (opts.author!.photo) {
        slide.elements.push({
          id: crypto.randomUUID(),
          type: "image",
          x: 24,
          y: opts.height - 24 - 40,
          width: 40,
          height: 40,
          rotation: 0,
          src: opts.author!.photo,
          locked: true,
          visible: true,
          zIndex: 100,
          style: { objectFit: "cover", borderRadius: 20, opacity: 1 },
        } as SlideElement);
      }
    });
  }

  // Distribute deco images as slide backgrounds
  if (opts.decoImages?.length) {
    opts.decoImages.forEach((img, i) => {
      const slideIdx = Math.min(i, result.length - 1);
      result[slideIdx].backgroundImage = img.dataUrl;
      result[slideIdx].backgroundImageOpacity = 0.3;
    });
  }

  // Distribute info images into content slides
  if (opts.infoImages?.length) {
    const contentSlides = result.filter((s) => s.type === "content");
    opts.infoImages.forEach((img, i) => {
      const target = contentSlides[i % Math.max(contentSlides.length, 1)];
      if (target) {
        target.elements.push({
          id: crypto.randomUUID(),
          type: "image",
          x: Math.round(opts.width * 0.1),
          y: Math.round(opts.height * 0.55),
          width: Math.round(opts.width * 0.8),
          height: Math.round(opts.height * 0.35),
          rotation: 0,
          src: img.dataUrl,
          locked: false,
          visible: true,
          zIndex: 50,
          style: { objectFit: "contain", borderRadius: 12, opacity: 1 },
        } as SlideElement);
      }
    });
  }

  return result;
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
  const [selectedModel, setSelectedModel] = useState("claude_sonnet_4_6");

  // Images
  const [decoImages, setDecoImages] = useState<{ id: string; name: string; dataUrl: string }[]>([]);
  const [infoImages, setInfoImages] = useState<{ id: string; name: string; dataUrl: string }[]>([]);
  const [refImages, setRefImages] = useState<{ id: string; name: string; dataUrl: string }[]>([]);

  // Author options
  const [showAuthor, setShowAuthor] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [authorPhoto, setAuthorPhoto] = useState<string | null>(null);
  const [authorFontSize, setAuthorFontSize] = useState(18);

  // Topline
  const [showTopline, setShowTopline] = useState(false);
  const [toplineText, setToplineText] = useState("");
  const [toplineFontSize, setToplineFontSize] = useState(14);

  const templates = useMemo(() => guestStorage.getTemplates(), [open]);
  const brandKits = useMemo(() => guestStorage.getBrandKits(), [open]);

  const getWidth = () => isCustom ? customW : FORMAT_PRESETS.find((f) => f.id === selectedFormat)?.width || 1080;
  const getHeight = () => isCustom ? customH : FORMAT_PRESETS.find((f) => f.id === selectedFormat)?.height || 1080;
  const getPlatform = () => isCustom ? "custom" : FORMAT_PRESETS.find((f) => f.id === selectedFormat)?.platform || "linkedin";

  const getBrandKit = (): GuestBrandKit | null => {
    if (!selectedBrandKit) return null;
    return brandKits.find((k) => k.id === selectedBrandKit) || null;
  };

  const handleImageUpload = (type: "deco" | "info" | "ref") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = (ev) => {
      const files = Array.from((ev.target as HTMLInputElement).files || []);
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const item = { id: crypto.randomUUID(), name: file.name, dataUrl: reader.result as string };
          if (type === "deco") setDecoImages((prev) => [...prev, item]);
          else if (type === "info") setInfoImages((prev) => [...prev, item]);
          else setRefImages((prev) => [...prev, item]);
        };
        reader.readAsDataURL(file);
      });
    };
    input.click();
  };

  const handleAuthorPhotoUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setAuthorPhoto(reader.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);

    const w = getWidth();
    const h = getHeight();
    const kit = getBrandKit();
    let slides: Slide[];

    const overlayOpts = {
      author: showAuthor && authorName ? { name: authorName, role: authorRole, photo: authorPhoto, fontSize: authorFontSize } : undefined,
      topline: showTopline && toplineText ? { text: toplineText, fontSize: toplineFontSize } : undefined,
      decoImages: decoImages.length ? decoImages : undefined,
      infoImages: infoImages.length ? infoImages : undefined,
      width: w,
      height: h,
    };

    try {
      // Template-based generation
      if (selectedTemplate) {
        const tpl = templates.find((t) => t.id === selectedTemplate);
        if (tpl) {
          const templateSlides: Slide[] = JSON.parse(tpl.slides);
          slides = generateFromTemplate(text, templateSlides);
          slides = injectOverlays(slides, overlayOpts);
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
              // New fields
              decoImages: decoImages.map((img) => ({ id: img.id, name: img.name })),
              infoImages: infoImages.map((img) => ({ id: img.id, name: img.name, dataUrl: img.dataUrl })),
              author: showAuthor ? { name: authorName, role: authorRole, photo: authorPhoto, fontSize: authorFontSize } : null,
              topline: showTopline ? { text: toplineText, fontSize: toplineFontSize } : null,
              refImages: refImages.map((img) => ({ dataUrl: img.dataUrl })),
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.slides) {
              slides = injectOverlays(data.slides, overlayOpts);
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
      slides = injectOverlays(slides, overlayOpts);
    } catch {
      slides = generateSlidesFallback(text, { width: w, height: h });
      slides = injectOverlays(slides, overlayOpts);
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

          <Separator />

          {/* IMAGES */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> Images (optionnel)
            </Label>

            {/* Deco images */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Images de decoration (fonds, ambiance)</span>
                <Button type="button" variant="outline" size="sm" className="h-6 text-xs px-2 gap-1" onClick={() => handleImageUpload("deco")}>
                  <Upload className="w-3 h-3" /> Ajouter
                </Button>
              </div>
              {decoImages.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5">
                  {decoImages.map((img) => (
                    <div key={img.id} className="relative group">
                      <img
                        src={img.dataUrl}
                        alt={img.name}
                        className="w-full rounded-md object-cover"
                        style={{ height: 60 }}
                      />
                      <button
                        type="button"
                        onClick={() => setDecoImages((prev) => prev.filter((i) => i.id !== img.id))}
                        className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info images */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Images informatives (contenu, graphiques)</span>
                <Button type="button" variant="outline" size="sm" className="h-6 text-xs px-2 gap-1" onClick={() => handleImageUpload("info")}>
                  <Upload className="w-3 h-3" /> Ajouter
                </Button>
              </div>
              {infoImages.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5">
                  {infoImages.map((img) => (
                    <div key={img.id} className="relative group">
                      <img
                        src={img.dataUrl}
                        alt={img.name}
                        className="w-full rounded-md object-cover"
                        style={{ height: 60 }}
                      />
                      <button
                        type="button"
                        onClick={() => setInfoImages((prev) => prev.filter((i) => i.id !== img.id))}
                        className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reference images */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">References visuelles (carousels existants a imiter)</span>
                <Button type="button" variant="outline" size="sm" className="h-6 text-xs px-2 gap-1" onClick={() => handleImageUpload("ref")}>
                  <Upload className="w-3 h-3" /> Ajouter
                </Button>
              </div>
              {refImages.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5">
                  {refImages.map((img) => (
                    <div key={img.id} className="relative group">
                      <img src={img.dataUrl} alt={img.name} className="w-full rounded-md object-cover" style={{ height: 60 }} />
                      <button type="button" onClick={() => setRefImages((prev) => prev.filter((i) => i.id !== img.id))}
                        className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* AUTEUR */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3" /> Auteur (optionnel)
              </Label>
              <Switch checked={showAuthor} onCheckedChange={setShowAuthor} />
            </div>

            {showAuthor && (
              <div className="space-y-2">
                {/* Photo + Nom + Fonction */}
                <div className="flex items-start gap-2">
                  {/* Photo upload */}
                  <button
                    type="button"
                    onClick={handleAuthorPhotoUpload}
                    className="shrink-0 w-10 h-10 rounded-full border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center overflow-hidden transition-colors"
                  >
                    {authorPhoto ? (
                      <img src={authorPhoto} alt="Photo auteur" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {/* Nom + Fonction */}
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Nom Prénom"
                      className="h-7 text-xs"
                    />
                    <Input
                      value={authorRole}
                      onChange={(e) => setAuthorRole(e.target.value)}
                      placeholder="Fonction / Titre"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>

                {/* Font size slider */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground shrink-0 w-20">Taille typo</span>
                  <Slider
                    min={10}
                    max={24}
                    step={1}
                    value={[authorFontSize]}
                    onValueChange={([v]) => setAuthorFontSize(v)}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-8 text-right">{authorFontSize}px</span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* TEXTE FIXE EN HAUT */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <TypeIcon className="w-3 h-3" /> Texte fixe en haut (optionnel)
              </Label>
              <Switch checked={showTopline} onCheckedChange={setShowTopline} />
            </div>

            {showTopline && (
              <div className="space-y-2">
                <Input
                  value={toplineText}
                  onChange={(e) => setToplineText(e.target.value)}
                  placeholder="Ex: Mon entreprise • Série d'articles"
                  className="h-7 text-xs"
                />
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground shrink-0 w-20">Taille typo</span>
                  <Slider
                    min={8}
                    max={20}
                    step={1}
                    value={[toplineFontSize]}
                    onValueChange={([v]) => setToplineFontSize(v)}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-8 text-right">{toplineFontSize}px</span>
                </div>
              </div>
            )}
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
// Build: 20260328121225
