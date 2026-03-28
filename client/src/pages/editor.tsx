import { useEffect, useRef, useCallback, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useCarouselStore } from "@/stores/carousel-store";
import { guestStorage } from "@/lib/guest-storage";
import {
  Slide,
  SlideElement,
  createDefaultSlide,
  createTextElement,
  createImageElement,
  GuestTemplate,
  GuestBrandKit,
  BrandKitImage,
} from "@/types/carousel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { FontPicker } from "@/components/font-picker";
import { GradientPicker, gradientToCSS } from "@/components/gradient-picker";
import type { GradientConfig, ShadowConfig } from "@/types/carousel";
import { FORMAT_PRESETS } from "@/lib/format-presets";
import { generateSlidesFallback } from "@/lib/slide-generator";
import {
  ArrowLeft,
  Save,
  Download,
  Plus,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Type,
  Image as ImageIcon,
  Square,
  Wand2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Loader2,
  Check,
  Undo2,
  Redo2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sparkles,
  FileDown,
  RectangleHorizontal,
  BookTemplate,
  Upload,
  Languages,
  Palette,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Group,
  Ungroup,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// SLIDE RENDERER — renders a single slide at given scale
// ═══════════════════════════════════════════════════════════════════
function SlideRenderer({
  slide,
  scale,
  slideWidth = 1080,
  slideHeight = 1080,
  isActive,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  interactive = false,
}: {
  slide: Slide;
  scale: number;
  slideWidth?: number;
  slideHeight?: number;
  isActive?: boolean;
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onUpdateElement?: (id: string, updates: Partial<SlideElement>) => void;
  interactive?: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    id: string;
    startX: number;
    startY: number;
    elX: number;
    elY: number;
  } | null>(null);
  const [resizeState, setResizeState] = useState<{
    id: string;
    handle: string;
    startX: number;
    startY: number;
    elW: number;
    elH: number;
    elX: number;
    elY: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, element: SlideElement) => {
      if (!interactive || element.locked) return;
      e.stopPropagation();
      onSelectElement?.(element.id);
      setDragState({
        id: element.id,
        startX: e.clientX,
        startY: e.clientY,
        elX: element.x,
        elY: element.y,
      });
    },
    [interactive, onSelectElement],
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, element: SlideElement, handle: string) => {
      if (!interactive || element.locked) return;
      e.stopPropagation();
      e.preventDefault();
      setResizeState({
        id: element.id,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        elW: element.width,
        elH: element.height,
        elX: element.x,
        elY: element.y,
      });
    },
    [interactive],
  );

  useEffect(() => {
    if (!dragState && !resizeState) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragState) {
        const dx = (e.clientX - dragState.startX) / scale;
        const dy = (e.clientY - dragState.startY) / scale;
        onUpdateElement?.(dragState.id, {
          x: Math.round(dragState.elX + dx),
          y: Math.round(dragState.elY + dy),
        });
      }
      if (resizeState) {
        const dx = (e.clientX - resizeState.startX) / scale;
        const dy = (e.clientY - resizeState.startY) / scale;
        let newW = resizeState.elW;
        let newH = resizeState.elH;
        let newX = resizeState.elX;
        let newY = resizeState.elY;

        if (resizeState.handle.includes("e"))
          newW = Math.max(40, resizeState.elW + dx);
        if (resizeState.handle.includes("w")) {
          newW = Math.max(40, resizeState.elW - dx);
          newX = resizeState.elX + dx;
        }
        if (resizeState.handle.includes("s"))
          newH = Math.max(20, resizeState.elH + dy);
        if (resizeState.handle.includes("n")) {
          newH = Math.max(20, resizeState.elH - dy);
          newY = resizeState.elY + dy;
        }

        onUpdateElement?.(resizeState.id, {
          x: Math.round(newX),
          y: Math.round(newY),
          width: Math.round(newW),
          height: Math.round(newH),
        });
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
      setResizeState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, resizeState, scale, onUpdateElement]);

  const resizeHandles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  const handlePositions: Record<string, React.CSSProperties> = {
    nw: { top: -4, left: -4, cursor: "nw-resize" },
    n: {
      top: -4,
      left: "50%",
      transform: "translateX(-50%)",
      cursor: "n-resize",
    },
    ne: { top: -4, right: -4, cursor: "ne-resize" },
    e: {
      top: "50%",
      right: -4,
      transform: "translateY(-50%)",
      cursor: "e-resize",
    },
    se: { bottom: -4, right: -4, cursor: "se-resize" },
    s: {
      bottom: -4,
      left: "50%",
      transform: "translateX(-50%)",
      cursor: "s-resize",
    },
    sw: { bottom: -4, left: -4, cursor: "sw-resize" },
    w: {
      top: "50%",
      left: -4,
      transform: "translateY(-50%)",
      cursor: "w-resize",
    },
  };

  const sortedElements = slide.elements
    .filter((el) => el.visible !== false)
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  const isAutoLayout = slide.autoLayout;

  return (
    <div
      className="slide-canvas relative overflow-hidden"
      style={{
        width: slideWidth * scale,
        height: slideHeight * scale,
        backgroundColor: slide.backgroundColor,
        backgroundImage: slide.backgroundGradient
          ? gradientToCSS(slide.backgroundGradient)
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        ...(isAutoLayout
          ? {
              display: "flex",
              flexDirection:
                slide.layoutDirection === "horizontal" ? "row" : "column",
              alignItems: slide.layoutAlign || "flex-start",
              gap: (slide.layoutGap ?? 8) * scale,
              padding: (slide.layoutPadding ?? 16) * scale,
            }
          : {}),
      }}
      onClick={(e) => {
        if (interactive && e.target === e.currentTarget) {
          onSelectElement?.(null);
          setEditingId(null);
        }
      }}
    >
      {/* Background image with opacity */}
      {slide.backgroundImage && (
        <div
          style={{
            position: "absolute" as const,
            inset: 0,
            backgroundImage: `url(${slide.backgroundImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: slide.backgroundImageOpacity ?? 1,
            pointerEvents: "none" as const,
            zIndex: 0,
          }}
        />
      )}
      {sortedElements.map((element) => {
        const isSelected = interactive && selectedElementId === element.id;
        const isEditing = editingId === element.id;

        const positionStyle: React.CSSProperties = isAutoLayout
          ? {
              position: "relative" as const,
              width: element.type === "image" || element.type === "text" ? "100%" : element.width * scale,
              maxWidth: "100%",
              height: element.type === "text" && (element.style.textAutoHeight !== false) ? "auto" : element.height * scale,
              minHeight: element.type === "text" ? undefined : undefined,
              flexShrink: 0,
              wordBreak: element.type === "text" ? "break-word" as const : undefined,
              overflowWrap: element.type === "text" ? "break-word" as const : undefined,
              zIndex: element.zIndex ?? 0,
            }
          : {
              position: "absolute" as const,
              left: element.x * scale,
              top: element.y * scale,
              width: element.width * scale,
              height: element.type === "text" && element.style.textAutoHeight ? "auto" : element.height * scale,
              minHeight: element.type === "text" && element.style.textAutoHeight ? element.height * scale : undefined,
              transform: element.rotation
                ? `rotate(${element.rotation}deg)`
                : undefined,
              zIndex: element.zIndex ?? 0,
            };

        return (
          <div
            key={element.id}
            style={{
              ...positionStyle,
              opacity: element.style.opacity ?? 1,
              cursor:
                interactive && !element.locked ? "move" : "default",
              outline: isSelected
                ? "2px solid hsl(239 84% 67%)"
                : "none",
              outlineOffset: 1,
              boxShadow: element.style.shadow
                ? `${element.style.shadow.x}px ${element.style.shadow.y}px ${element.style.shadow.blur}px ${element.style.shadow.spread}px ${element.style.shadow.color}`
                : undefined,
              filter: element.style.filterBlur ? `blur(${element.style.filterBlur}px)` : undefined,
            }}
            onMouseDown={(e) => handleMouseDown(e, element)}
            onDoubleClick={() => {
              if (
                interactive &&
                element.type === "text" &&
                !element.locked
              ) {
                setEditingId(element.id);
              }
            }}
            data-testid={`element-${element.id}`}
          >
            {element.type === "text" &&
              (isEditing ? (
                <textarea
                  autoFocus
                  value={element.content || ""}
                  onChange={(e) =>
                    onUpdateElement?.(element.id, {
                      content: e.target.value,
                    })
                  }
                  onBlur={() => setEditingId(null)}
                  className="w-full h-full resize-none border-0 bg-transparent outline-none p-0"
                  style={{
                    fontSize: (element.style.fontSize || 24) * scale,
                    fontFamily: element.style.fontFamily || "Inter",
                    fontWeight: element.style.fontWeight || 400,
                    color: element.style.color || "#000",
                    textAlign:
                      (element.style.textAlign as any) || "left",
                    lineHeight: element.style.lineHeight || 1.4,
                    letterSpacing: element.style.letterSpacing
                      ? `${element.style.letterSpacing}em`
                      : undefined,
                    textDecoration: element.style.textDecoration,
                    fontStyle: element.style.fontStyle,
                    wordBreak: "break-word",
                    overflow: "hidden",
                  }}
                />
              ) : (
                <div
                  className="w-full h-full whitespace-pre-wrap"
                  lang={element.style.hyphens ? "fr" : undefined}
                  style={{
                    fontSize: (element.style.fontSize || 24) * scale,
                    fontFamily: element.style.fontFamily || "Inter",
                    fontWeight: element.style.fontWeight || 400,
                    color: element.style.color || "#000",
                    textAlign: element.style.textAlign || "left",
                    lineHeight: element.style.lineHeight || 1.4,
                    letterSpacing: element.style.letterSpacing
                      ? `${element.style.letterSpacing}em`
                      : undefined,
                    textDecoration: element.style.textDecoration,
                    fontStyle: element.style.fontStyle,
                    wordBreak: "break-word",
                    overflow: "hidden",
                    hyphens: element.style.hyphens ? "auto" : undefined,
                    WebkitHyphens: element.style.hyphens ? "auto" : undefined,
                  }}
                >
                  {element.content || "Texte"}
                </div>
              ))}

            {element.type === "image" && (
              <img
                src={element.src}
                alt=""
                className="w-full h-full"
                style={{
                  objectFit:
                    (element.style.objectFit as any) || "cover",
                  borderRadius: element.style.borderRadius
                    ? element.style.borderRadius * scale
                    : 0,
                }}
                crossOrigin="anonymous"
                draggable={false}
              />
            )}

            {element.type === "shape" && (
              <div
                className="w-full h-full"
                style={{
                  backgroundColor: element.style.gradient
                    ? undefined
                    : element.style.backgroundColor || "#6366F1",
                  backgroundImage: element.style.gradient
                    ? gradientToCSS(element.style.gradient)
                    : undefined,
                  borderRadius: element.style.borderRadius
                    ? element.style.borderRadius * scale
                    : 0,
                }}
              />
            )}

            {element.type === "divider" && (
              <div
                className="w-full"
                style={{
                  height: 2 * scale,
                  backgroundColor: element.style.color || "#E5E7EB",
                  marginTop: (element.height * scale) / 2,
                }}
              />
            )}

            {element.type === "group" && element.children && (
              <div
                className="w-full h-full"
                style={{
                  position: "relative",
                  ...(element.groupAutoLayout ? {
                    display: "flex",
                    flexDirection: element.groupDirection === "horizontal" ? "row" : "column",
                    gap: (element.groupGap ?? 8) * scale,
                    padding: (element.groupPadding ?? 0) * scale,
                    alignItems: element.groupAlign || "flex-start",
                  } : {}),
                }}
              >
                {element.children
                  .filter(c => c.visible !== false)
                  .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
                  .map(child => {
                    const childStyle: React.CSSProperties = element.groupAutoLayout
                      ? {
                          position: "relative",
                          width: child.type === "text" ? "100%" : child.width * scale,
                          height: child.type === "text" && child.style.textAutoHeight ? "auto" : child.height * scale,
                        }
                      : {
                          position: "absolute",
                          left: child.x * scale,
                          top: child.y * scale,
                          width: child.width * scale,
                          height: child.height * scale,
                        };
                    return (
                      <div key={child.id} style={childStyle}>
                        {child.type === "text" && (
                          <div className="w-full h-full whitespace-pre-wrap" style={{
                            fontSize: (child.style.fontSize || 24) * scale,
                            fontFamily: child.style.fontFamily || "Inter",
                            fontWeight: child.style.fontWeight || 400,
                            color: child.style.color || "#000",
                            textAlign: child.style.textAlign || "left",
                            lineHeight: child.style.lineHeight || 1.4,
                            wordBreak: "break-word",
                            overflow: "hidden",
                          }}>{child.content || "Texte"}</div>
                        )}
                        {child.type === "image" && child.src && (
                          <img src={child.src} alt="" className="w-full h-full" style={{ objectFit: child.style.objectFit || "cover", borderRadius: child.style.borderRadius ? child.style.borderRadius * scale : 0 }} draggable={false} />
                        )}
                        {child.type === "shape" && (
                          <div className="w-full h-full" style={{ backgroundColor: child.style.backgroundColor || "#6366F1", borderRadius: child.style.borderRadius ? child.style.borderRadius * scale : 0 }} />
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {isSelected && !element.locked && interactive && (
              <>
                {resizeHandles.map((handle) => (
                  <div
                    key={handle}
                    className="absolute w-2 h-2 bg-white border-2 rounded-sm"
                    style={{
                      ...handlePositions[handle],
                      borderColor: "hsl(239 84% 67%)",
                      zIndex: 101,
                    }}
                    onMouseDown={(e) =>
                      handleResizeMouseDown(e, element, handle)
                    }
                  />
                ))}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PROPERTIES PANEL — right side
// ═══════════════════════════════════════════════════════════════════
function PropertiesPanel() {
  const {
    slides,
    activeSlideIndex,
    selectedElementId,
    selectedElementIds,
    settings,
    updateSlide,
    updateElement,
    updateElementStyle,
    deleteElement,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    setSlides,
    groupElements,
    ungroupElement,
    pushHistory,
  } = useCarouselStore();

  const brandKits = useState(() => guestStorage.getBrandKits())[0];

  const slide = slides[activeSlideIndex];
  const element = selectedElementId
    ? slide?.elements.find((el) => el.id === selectedElementId)
    : null;

  if (!slide) return null;

  // ── Slide properties when no element selected ──
  if (!element) {
    return (
      <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          Slide {activeSlideIndex + 1}
        </h3>

        {/* Background color */}
        <div className="space-y-2">
          <Label className="text-xs">Couleur de fond</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={slide.backgroundColor}
              onChange={(e) =>
                updateSlide(activeSlideIndex, {
                  backgroundColor: e.target.value,
                })
              }
              className="w-9 h-9 rounded-md cursor-pointer border-0 p-0"
            />
            <Input
              value={slide.backgroundColor}
              onChange={(e) =>
                updateSlide(activeSlideIndex, {
                  backgroundColor: e.target.value,
                })
              }
              className="h-9 font-mono text-xs uppercase"
              maxLength={7}
            />
          </div>
        </div>

        <GradientPicker
          value={slide.backgroundGradient}
          fallbackColor={slide.backgroundColor}
          onChange={(gradient) => updateSlide(activeSlideIndex, { backgroundGradient: gradient })}
        />

        {/* Background image upload */}
        <div className="space-y-2">
          <Label className="text-xs">Image de fond</Label>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = (ev) => {
                  const file = (ev.target as HTMLInputElement)
                    .files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    updateSlide(activeSlideIndex, {
                      backgroundImage: reader.result as string,
                    });
                  };
                  reader.readAsDataURL(file);
                };
                input.click();
              }}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Ajouter une image
            </Button>
            {slide.backgroundImage && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Opacite ({Math.round((slide.backgroundImageOpacity ?? 1) * 100)}%)</Label>
                  <Slider
                    value={[(slide.backgroundImageOpacity ?? 1) * 100]}
                    onValueChange={([v]) => updateSlide(activeSlideIndex, { backgroundImageOpacity: v / 100 })}
                    min={0} max={100} step={1}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-destructive"
                  onClick={() =>
                    updateSlide(activeSlideIndex, {
                      backgroundImage: undefined,
                      backgroundImageOpacity: undefined,
                    })
                  }
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Supprimer l'image
                </Button>
              </>
            )}
          </div>
        </div>

        <Separator />

        {/* Slide type */}
        <div className="space-y-2">
          <Label className="text-xs">Type</Label>
          <Select
            key={`type-${slide.id}`}
            value={slide.type}
            onValueChange={(v: any) =>
              updateSlide(activeSlideIndex, { type: v })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">Cover</SelectItem>
              <SelectItem value="content">Content</SelectItem>
              <SelectItem value="end">End</SelectItem>
              <SelectItem value="blank">Blank</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Auto-layout controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Auto-layout</Label>
            <Switch
              checked={!!slide.autoLayout}
              onCheckedChange={(checked) =>
                updateSlide(activeSlideIndex, { autoLayout: checked })
              }
            />
          </div>
          {slide.autoLayout && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Direction</Label>
                <Select
                  value={slide.layoutDirection || "vertical"}
                  onValueChange={(v: any) =>
                    updateSlide(activeSlideIndex, {
                      layoutDirection: v,
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="horizontal">
                      Horizontal
                    </SelectItem>
                    <SelectItem value="vertical">Vertical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Alignement</Label>
                <Select
                  value={slide.layoutAlign || "flex-start"}
                  onValueChange={(v: any) =>
                    updateSlide(activeSlideIndex, {
                      layoutAlign: v,
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flex-start">Debut</SelectItem>
                    <SelectItem value="center">Centre</SelectItem>
                    <SelectItem value="flex-end">Fin</SelectItem>
                    <SelectItem value="stretch">Etirer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">
                  Gap ({slide.layoutGap ?? 8}px)
                </Label>
                <Slider
                  value={[slide.layoutGap ?? 8]}
                  onValueChange={([v]) =>
                    updateSlide(activeSlideIndex, { layoutGap: v })
                  }
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">
                  Padding ({slide.layoutPadding ?? 16}px)
                </Label>
                <Slider
                  value={[slide.layoutPadding ?? 16]}
                  onValueChange={([v]) =>
                    updateSlide(activeSlideIndex, {
                      layoutPadding: v,
                    })
                  }
                  min={0}
                  max={200}
                  step={1}
                />
              </div>
            </>
          )}
        </div>

        {/* Brand Kit quick access */}
        {brandKits.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Charte graphique</Label>
              {brandKits.map((kit) => (
                <div key={kit.id} className="space-y-2 rounded-lg border p-2.5">
                  <span className="text-xs font-medium">{kit.name}</span>
                  {/* Colors */}
                  <div className="flex items-center gap-1">
                    {[
                      { color: kit.primaryColor, label: "Principale" },
                      { color: kit.secondaryColor, label: "Secondaire" },
                      { color: kit.accentColor, label: "Accent" },
                      { color: kit.backgroundColor, label: "Fond" },
                    ].map((c) => (
                      <button
                        key={c.label}
                        title={`${c.label}: ${c.color} — Clic = fond de slide`}
                        className="w-7 h-7 rounded-md border border-border hover:scale-110 transition-transform cursor-pointer"
                        style={{ backgroundColor: c.color }}
                        onClick={() => updateSlide(activeSlideIndex, { backgroundColor: c.color })}
                      />
                    ))}
                  </div>
                  {/* Fonts */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      <strong>Titres:</strong> {kit.headingFont}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      <strong>Corps:</strong> {kit.bodyFont}
                    </span>
                  </div>
                  {/* Apply to all slides */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-7"
                    onClick={() => {
                      const bgPalette = [
                        kit.backgroundColor || "#FFFFFF",
                        kit.primaryColor || "#1A1A2E",
                        kit.backgroundColor || "#FFFFFF",
                        kit.secondaryColor || "#6366F1",
                        kit.backgroundColor || "#FFFFFF",
                        kit.accentColor || "#F59E0B",
                        kit.backgroundColor || "#FFFFFF",
                        kit.primaryColor || "#1A1A2E",
                        kit.primaryColor || "#1A1A2E",
                      ];
                      function contrast(bgHex: string): string {
                        const hex = bgHex.replace("#", "");
                        const r = parseInt(hex.substr(0, 2), 16) || 0;
                        const g = parseInt(hex.substr(2, 2), 16) || 0;
                        const b = parseInt(hex.substr(4, 2), 16) || 0;
                        return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? "#1A1A2E" : "#FFFFFF";
                      }
                      const newSlides = slides.map((s, i) => {
                        const bg = bgPalette[i % bgPalette.length];
                        const txt = contrast(bg);
                        return {
                          ...s,
                          backgroundColor: bg,
                          elements: s.elements.map((el) =>
                            el.type === "text"
                              ? {
                                  ...el,
                                  style: {
                                    ...el.style,
                                    color: txt,
                                    fontFamily:
                                      el.style.fontWeight && el.style.fontWeight >= 700
                                        ? kit.headingFont || el.style.fontFamily
                                        : kit.bodyFont || el.style.fontFamily,
                                  },
                                }
                              : el
                          ),
                        };
                      });
                      setSlides(newSlides);
                    }}
                  >
                    <Palette className="w-3 h-3 mr-1" />
                    Appliquer a toutes les slides
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Element properties ──
  return (
    <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          {element.type === "text"
            ? "Texte"
            : element.type === "image"
              ? "Image"
              : element.type === "shape"
                ? "Forme"
                : element.type === "group"
                  ? "Groupe"
                  : "Element"}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Bringforward"
            onClick={() => bringForward(element.id)}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Send backward"
            onClick={() => sendBackward(element.id)}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Bring to front"
            onClick={() => bringToFront(element.id)}
          >
            <ChevronsUp className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Send to back"
            onClick={() => sendToBack(element.id)}
          >
            <ChevronsDown className="w-3.5 h-3.5" />
          </Button>
          <Separator orientation="vertical" className="h-5 mx-0.5" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() =>
              updateElement(element.id, { locked: !element.locked })
            }
          >
            {element.locked ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <Unlock className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() =>
              updateElement(element.id, {
                visible: element.visible === false ? true : false,
              })
            }
          >
            {element.visible !== false ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={() => deleteElement(element.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Position & Size */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Position
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">X</Label>
            <Input
              type="number"
              value={element.x}
              onChange={(e) =>
                updateElement(element.id, {
                  x: Number(e.target.value),
                })
              }
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Y</Label>
            <Input
              type="number"
              value={element.y}
              onChange={(e) =>
                updateElement(element.id, {
                  y: Number(e.target.value),
                })
              }
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">L</Label>
            <Input
              type="number"
              value={element.width}
              onChange={(e) =>
                updateElement(element.id, {
                  width: Number(e.target.value),
                })
              }
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">H</Label>
            <Input
              type="number"
              value={element.height}
              onChange={(e) =>
                updateElement(element.id, {
                  height: Number(e.target.value),
                })
              }
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Alignment buttons — Figma-style */}
        <div className="mt-2">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Alignement</p>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Aligner a gauche"
              onClick={() => updateElement(element.id, { x: 0 })}>
              <AlignStartVertical className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Centrer horizontalement"
              onClick={() => updateElement(element.id, { x: Math.round((settings.width - element.width) / 2) })}>
              <AlignCenterVertical className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Aligner a droite"
              onClick={() => updateElement(element.id, { x: settings.width - element.width })}>
              <AlignEndVertical className="w-3.5 h-3.5" />
            </Button>
            <Separator orientation="vertical" className="h-5 mx-0.5" />
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Aligner en haut"
              onClick={() => updateElement(element.id, { y: 0 })}>
              <AlignStartHorizontal className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Centrer verticalement"
              onClick={() => updateElement(element.id, { y: Math.round((settings.height - element.height) / 2) })}>
              <AlignCenterHorizontal className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Aligner en bas"
              onClick={() => updateElement(element.id, { y: settings.height - element.height })}>
              <AlignEndHorizontal className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Text-specific controls */}
      {element.type === "text" && (
        <>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Typographie
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Police</Label>
                <FontPicker
                  value={element.style.fontFamily || "Inter"}
                  onChange={(fontFamily) => updateElementStyle(element.id, { fontFamily })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Taille</Label>
                  <Input
                    type="number"
                    value={element.style.fontSize || 24}
                    onChange={(e) =>
                      updateElementStyle(element.id, {
                        fontSize: Number(e.target.value),
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Graisse</Label>
                  <Select
                    value={String(element.style.fontWeight || 400)}
                    onValueChange={(v) =>
                      updateElementStyle(element.id, {
                        fontWeight: Number(v),
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">Light</SelectItem>
                      <SelectItem value="400">Regular</SelectItem>
                      <SelectItem value="500">Medium</SelectItem>
                      <SelectItem value="600">Semibold</SelectItem>
                      <SelectItem value="700">Bold</SelectItem>
                      <SelectItem value="800">Extra Bold</SelectItem>
                      <SelectItem value="900">Black</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Style buttons */}
              <div className="flex items-center gap-1">
                <Button
                  variant={
                    element.style.fontWeight &&
                    element.style.fontWeight >= 700
                      ? "secondary"
                      : "ghost"
                  }
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    updateElementStyle(element.id, {
                      fontWeight:
                        (element.style.fontWeight || 400) >= 700
                          ? 400
                          : 700,
                    })
                  }
                >
                  <Bold className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant={
                    element.style.fontStyle === "italic"
                      ? "secondary"
                      : "ghost"
                  }
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    updateElementStyle(element.id, {
                      fontStyle:
                        element.style.fontStyle === "italic"
                          ? "normal"
                          : "italic",
                    })
                  }
                >
                  <Italic className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant={
                    element.style.textDecoration === "underline"
                      ? "secondary"
                      : "ghost"
                  }
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    updateElementStyle(element.id, {
                      textDecoration:
                        element.style.textDecoration === "underline"
                          ? "none"
                          : "underline",
                    })
                  }
                >
                  <Underline className="w-3.5 h-3.5" />
                </Button>
                <Separator
                  orientation="vertical"
                  className="h-6 mx-1"
                />
                <Button
                  variant={
                    element.style.textAlign === "left"
                      ? "secondary"
                      : "ghost"
                  }
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    updateElementStyle(element.id, {
                      textAlign: "left",
                    })
                  }
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant={
                    element.style.textAlign === "center"
                      ? "secondary"
                      : "ghost"
                  }
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    updateElementStyle(element.id, {
                      textAlign: "center",
                    })
                  }
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant={
                    element.style.textAlign === "right"
                      ? "secondary"
                      : "ghost"
                  }
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    updateElementStyle(element.id, {
                      textAlign: "right",
                    })
                  }
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </Button>
                <Button variant={element.style.textAlign === "justify" ? "secondary" : "ghost"} size="icon" className="h-8 w-8"
                  onClick={() => updateElementStyle(element.id, { textAlign: "justify" })}>
                  <AlignJustify className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">Cesure</Label>
                <Switch checked={!!element.style.hyphens} onCheckedChange={(v) => updateElementStyle(element.id, { hyphens: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Hauteur auto</Label>
                <Switch checked={!!element.style.textAutoHeight} onCheckedChange={(v) => updateElementStyle(element.id, { textAutoHeight: v })} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Interligne</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={element.style.lineHeight || 1.4}
                    onChange={(e) =>
                      updateElementStyle(element.id, {
                        lineHeight: Number(e.target.value),
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Espacement</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={element.style.letterSpacing || 0}
                    onChange={(e) =>
                      updateElementStyle(element.id, {
                        letterSpacing: Number(e.target.value),
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-xs">Couleur du texte</Label>
            <div className="flex items-center gap-2 mt-1.5">
              <input
                type="color"
                value={element.style.color || "#000000"}
                onChange={(e) =>
                  updateElementStyle(element.id, {
                    color: e.target.value,
                  })
                }
                className="w-9 h-9 rounded-md cursor-pointer border-0 p-0"
              />
              <Input
                value={element.style.color || "#000000"}
                onChange={(e) =>
                  updateElementStyle(element.id, {
                    color: e.target.value,
                  })
                }
                className="h-8 font-mono text-xs uppercase"
                maxLength={7}
              />
            </div>
          </div>
        </>
      )}

      {/* Image-specific controls */}
      {element.type === "image" && (
        <>
          <div className="space-y-2">
            <Label className="text-xs">Ajustement</Label>
            <Select
              value={element.style.objectFit || "cover"}
              onValueChange={(v: any) =>
                updateElementStyle(element.id, { objectFit: v })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cover</SelectItem>
                <SelectItem value="contain">Contain</SelectItem>
                <SelectItem value="fill">Fill</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Rayon de bordure</Label>
            <Slider
              value={[element.style.borderRadius || 0]}
              onValueChange={([v]) =>
                updateElementStyle(element.id, { borderRadius: v })
              }
              min={0}
              max={100}
              step={1}
            />
          </div>
        </>
      )}

      {/* Shape controls */}
      {element.type === "shape" && (
        <>
          <div>
            <Label className="text-xs">Couleur</Label>
            <div className="flex items-center gap-2 mt-1.5">
              <input
                type="color"
                value={element.style.backgroundColor || "#6366F1"}
                onChange={(e) =>
                  updateElementStyle(element.id, {
                    backgroundColor: e.target.value,
                  })
                }
                className="w-9 h-9 rounded-md cursor-pointer border-0 p-0"
              />
              <Input
                value={element.style.backgroundColor || "#6366F1"}
                onChange={(e) =>
                  updateElementStyle(element.id, {
                    backgroundColor: e.target.value,
                  })
                }
                className="h-8 font-mono text-xs uppercase"
                maxLength={7}
              />
            </div>
          </div>
          <GradientPicker
            value={element.style.gradient}
            fallbackColor={element.style.backgroundColor || "#6366F1"}
            onChange={(gradient) => updateElementStyle(element.id, { gradient })}
          />
          <div className="space-y-2">
            <Label className="text-xs">Rayon de bordure</Label>
            <Slider
              value={[element.style.borderRadius || 0]}
              onValueChange={([v]) =>
                updateElementStyle(element.id, { borderRadius: v })
              }
              min={0}
              max={540}
              step={1}
            />
          </div>
        </>
      )}

      {/* Group controls */}
      {element.type === "group" && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Auto-layout groupe</Label>
              <Switch checked={!!element.groupAutoLayout} onCheckedChange={(v) => updateElement(element.id, { groupAutoLayout: v })} />
            </div>
            {element.groupAutoLayout && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Direction</Label>
                  <Select value={element.groupDirection || "vertical"} onValueChange={(v: any) => updateElement(element.id, { groupDirection: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="horizontal">Horizontal</SelectItem>
                      <SelectItem value="vertical">Vertical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Alignement</Label>
                  <Select value={element.groupAlign || "flex-start"} onValueChange={(v: any) => updateElement(element.id, { groupAlign: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flex-start">Debut</SelectItem>
                      <SelectItem value="center">Centre</SelectItem>
                      <SelectItem value="flex-end">Fin</SelectItem>
                      <SelectItem value="stretch">Etirer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Gap ({element.groupGap ?? 8}px)</Label>
                  <Slider value={[element.groupGap ?? 8]} onValueChange={([v]) => updateElement(element.id, { groupGap: v })} min={0} max={100} step={1} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Padding ({element.groupPadding ?? 0}px)</Label>
                  <Slider value={[element.groupPadding ?? 0]} onValueChange={([v]) => updateElement(element.id, { groupPadding: v })} min={0} max={100} step={1} />
                </div>
              </>
            )}
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { pushHistory(); ungroupElement(element.id); }}>
              <Ungroup className="w-3 h-3 mr-1" /> Degrouper
            </Button>
          </div>
        </>
      )}

      {/* Opacity — all elements */}
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs">
          Opacite ({Math.round((element.style.opacity ?? 1) * 100)}%)
        </Label>
        <Slider
          value={[(element.style.opacity ?? 1) * 100]}
          onValueChange={([v]) =>
            updateElementStyle(element.id, { opacity: v / 100 })
          }
          min={0}
          max={100}
          step={1}
        />
      </div>

      {/* Shadow — all elements */}
      <Separator />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Ombre</Label>
          <Switch checked={!!element.style.shadow} onCheckedChange={(v) => {
            if (v) updateElementStyle(element.id, { shadow: { x: 4, y: 4, blur: 12, spread: 0, color: "#00000033" } });
            else updateElementStyle(element.id, { shadow: undefined });
          }} />
        </div>
        {element.style.shadow && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">X</Label>
                <Input type="number" value={element.style.shadow.x} onChange={(e) => updateElementStyle(element.id, { shadow: { ...element.style.shadow!, x: Number(e.target.value) } })} className="h-6 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Y</Label>
                <Input type="number" value={element.style.shadow.y} onChange={(e) => updateElementStyle(element.id, { shadow: { ...element.style.shadow!, y: Number(e.target.value) } })} className="h-6 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Flou</Label>
                <Input type="number" value={element.style.shadow.blur} onChange={(e) => updateElementStyle(element.id, { shadow: { ...element.style.shadow!, blur: Number(e.target.value) } })} className="h-6 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Etendue</Label>
                <Input type="number" value={element.style.shadow.spread} onChange={(e) => updateElementStyle(element.id, { shadow: { ...element.style.shadow!, spread: Number(e.target.value) } })} className="h-6 text-xs" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={element.style.shadow.color.slice(0, 7)} onChange={(e) => updateElementStyle(element.id, { shadow: { ...element.style.shadow!, color: e.target.value + "33" } })} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
              <Input value={element.style.shadow.color} onChange={(e) => updateElementStyle(element.id, { shadow: { ...element.style.shadow!, color: e.target.value } })} className="h-6 text-[10px] font-mono" maxLength={9} />
            </div>
          </div>
        )}
      </div>

      {/* Blur — all elements */}
      <div className="space-y-2">
        <Label className="text-xs">Flou ({element.style.filterBlur || 0}px)</Label>
        <Slider value={[element.style.filterBlur || 0]} onValueChange={([v]) => updateElementStyle(element.id, { filterBlur: v })} min={0} max={40} step={1} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT DIALOG — Server-side export via fetch
// ═══════════════════════════════════════════════════════════════════
function ExportDialog({
  slides,
  settings,
}: {
  slides: Slide[];
  settings: any;
}) {
  const [format, setFormat] = useState("png");
  const [quality, setQuality] = useState("2");
  const [isExporting, setIsExporting] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setElapsedSec(0);
    timerRef.current = setInterval(
      () => setElapsedSec((s) => s + 1),
      1000,
    );

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000);

      const res = await fetch("./api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides,
          settings,
          format,
          pixelRatio: Number(quality),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Export failed: ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      if (format === "pdf") {
        a.download = "carousel.pdf";
      } else if (slides.length > 1) {
        a.download = "carousel.zip";
      } else {
        a.download = `slide.${format}`;
      }

      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Exporter le carrousel</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-2">
        <div className="space-y-2">
          <Label>Format</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="jpeg">JPEG</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Qualite</Label>
          <Select value={quality} onValueChange={setQuality}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">
                x1 ({settings.width}px)
              </SelectItem>
              <SelectItem value="2">
                x2 ({settings.width * 2}px)
              </SelectItem>
              <SelectItem value="4">
                x4 ({settings.width * 4}px)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="w-full"
          onClick={handleExport}
          disabled={isExporting}
          data-testid="button-export-confirm"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <FileDown className="w-4 h-4 mr-2" />
          )}
          {isExporting
            ? `Export en cours... ${elapsedSec}s`
            : "Telecharger"}
        </Button>
      </div>
    </DialogContent>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GENERATE DIALOG
// ═══════════════════════════════════════════════════════════════════
function GenerateDialog({
  onGenerate,
}: {
  onGenerate: (text: string) => void;
}) {
  const [text, setText] = useState("");

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Generer un carrousel
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Collez votre texte ici... L'IA va analyser le contenu et generer un carrousel structure avec les points cles."
          className="min-h-[200px]"
          data-testid="input-generate-text"
        />
        <Button
          className="w-full"
          onClick={() => onGenerate(text)}
          disabled={!text.trim()}
          data-testid="button-generate"
        >
          <Wand2 className="w-4 h-4 mr-2" />
          Generer les slides
        </Button>
      </div>
    </DialogContent>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SAVE TEMPLATE DIALOG
// ═══════════════════════════════════════════════════════════════════
function SaveTemplateDialog({
  slides,
  settings,
  onClose,
}: {
  slides: Slide[];
  settings: any;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;
    guestStorage.saveTemplate({
      name: name.trim(),
      category,
      slides: JSON.stringify(slides),
      settings: JSON.stringify(settings),
    });
    setSaved(true);
    setTimeout(() => onClose(), 800);
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <BookTemplate className="w-4 h-4" />
          Sauvegarder comme template
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-2">
        <div className="space-y-2">
          <Label>Nom du template</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mon template..."
            data-testid="input-template-name"
          />
        </div>
        <div className="space-y-2">
          <Label>Categorie</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="personal">Personnel</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="w-full"
          onClick={handleSave}
          disabled={!name.trim() || saved}
          data-testid="button-save-template"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Sauvegarde !
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </>
          )}
        </Button>
      </div>
    </DialogContent>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN EDITOR PAGE
// ═══════════════════════════════════════════════════════════════════
export default function EditorPage() {
  const [, params] = useRoute("/editor/:id");
  const [, navigate] = useLocation();
  const id = params?.id || null;
  const containerRef = useRef<HTMLDivElement>(null);
  const shiftHeldRef = useRef(false);
  const [canvasScale, setCanvasScale] = useState(0.5);
  const [showExport, setShowExport] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [editorBrandKits] = useState(() => guestStorage.getBrandKits());
  const [brandKitImagesOpen, setBrandKitImagesOpen] = useState(false);
  const [activeBrandKitForImages, setActiveBrandKitForImages] = useState<string | null>(
    () => guestStorage.getBrandKits()[0]?.id || null
  );

  const {
    slides,
    activeSlideIndex,
    selectedElementId,
    selectedElementIds,
    title,
    settings,
    isDirty,
    lastSavedAt,
    setCarousel,
    setTitle,
    setSettings,
    setActiveSlide,
    selectElement,
    toggleSelectElement,
    addSlide,
    duplicateSlide,
    deleteSlide,
    addElement,
    updateElement,
    updateElementStyle,
    deleteElement,
    pushHistory,
    undo,
    redo,
    setSlides,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    markSaved,
    groupElements,
    ungroupElement,
  } = useCarouselStore();

  // Load guest carousel from localStorage on mount
  useEffect(() => {
    if (!id) return;
    const gc = guestStorage.getCarousel(id);
    if (gc) {
      try {
        const parsedSlides = JSON.parse(gc.slides || "[]");
        const parsedSettings = JSON.parse(gc.settings || "{}");
        setCarousel(
          0,
          gc.title,
          parsedSlides,
          {
            width: 1080,
            height: 1080,
            platform: "linkedin" as const,
            ...parsedSettings,
          },
          gc.brandKitId,
        );
      } catch {
        // ignore parse errors
      }
    }
  }, [id, setCarousel]);

  // Guest auto-save to localStorage every 2 seconds
  const guestSave = useCallback(() => {
    if (!id) return;
    const store = useCarouselStore.getState();
    guestStorage.updateCarousel(id, {
      title: store.title,
      slides: JSON.stringify(store.slides),
      settings: JSON.stringify(store.settings),
    });
    store.markSaved();
  }, [id]);

  const handleSave = useCallback(() => {
    if (!id) return;
    setIsSaving(true);
    guestSave();
    setTimeout(() => setIsSaving(false), 300);
  }, [id, guestSave]);

  // Auto-save debounced
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isDirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      guestSave();
    }, 2000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [isDirty, slides, title, settings, guestSave]);

  // Calculate scale based on container size
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const { width, height } =
        containerRef.current.getBoundingClientRect();
      const padding = 60;
      const scaleX = (width - padding * 2) / settings.width;
      const scaleY = (height - padding * 2) / settings.height;
      setCanvasScale(Math.min(scaleX, scaleY, 0.8));
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [settings.width, settings.height]);

  // Track Shift key state
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Shift") shiftHeldRef.current = true; };
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === "Shift") shiftHeldRef.current = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Keyboard shortcuts (Figma-style)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const ctrlOrCmd = e.ctrlKey || e.metaKey;

      // Ctrl+S = save
      if (ctrlOrCmd && e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }

      // Ctrl+Z = undo
      if (ctrlOrCmd && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y = redo
      if (
        ctrlOrCmd &&
        (e.key === "y" || (e.key === "z" && e.shiftKey)) &&
        !(e.key === "z" && !e.shiftKey)
      ) {
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl+D = duplicate element or slide
      if (ctrlOrCmd && e.key === "d") {
        e.preventDefault();
        if (selectedElementId) {
          const el = slides[activeSlideIndex]?.elements.find(
            (elem) => elem.id === selectedElementId,
          );
          if (el) {
            addElement({
              ...JSON.parse(JSON.stringify(el)),
              id: crypto.randomUUID(),
              x: el.x + 20,
              y: el.y + 20,
            });
          }
        } else {
          duplicateSlide(activeSlideIndex);
        }
        return;
      }

      // Ctrl+] = bringForward
      if (ctrlOrCmd && e.key === "]" && !e.shiftKey) {
        e.preventDefault();
        if (selectedElementId) bringForward(selectedElementId);
        return;
      }

      // Ctrl+[ = sendBackward
      if (ctrlOrCmd && e.key === "[" && !e.shiftKey) {
        e.preventDefault();
        if (selectedElementId) sendBackward(selectedElementId);
        return;
      }

      // Ctrl+Shift+] = bringToFront
      if (ctrlOrCmd && e.key === "]" && e.shiftKey) {
        e.preventDefault();
        if (selectedElementId) bringToFront(selectedElementId);
        return;
      }

      // Ctrl+Shift+[ = sendToBack
      if (ctrlOrCmd && e.key === "[" && e.shiftKey) {
        e.preventDefault();
        if (selectedElementId) sendToBack(selectedElementId);
        return;
      }

      // Ctrl+G = group selected elements
      if (ctrlOrCmd && e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        const store = useCarouselStore.getState();
        if (store.selectedElementIds.length >= 2) {
          pushHistory();
          groupElements(store.selectedElementIds);
        }
        return;
      }

      // Ctrl+Shift+G = ungroup selected group
      if (ctrlOrCmd && e.key === "g" && e.shiftKey) {
        e.preventDefault();
        if (selectedElementId) {
          const el = slides[activeSlideIndex]?.elements.find(elem => elem.id === selectedElementId);
          if (el?.type === "group") {
            pushHistory();
            ungroupElement(selectedElementId);
          }
        }
        return;
      }

      // Delete/Backspace = delete selected element
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedElementId) {
          e.preventDefault();
          deleteElement(selectedElementId);
        }
        return;
      }

      // Arrow keys = move selected element
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.key,
        )
      ) {
        if (selectedElementId) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const el = slides[activeSlideIndex]?.elements.find(
            (elem) => elem.id === selectedElementId,
          );
          if (el && !el.locked) {
            const updates: Partial<SlideElement> = {};
            if (e.key === "ArrowUp") updates.y = el.y - step;
            if (e.key === "ArrowDown") updates.y = el.y + step;
            if (e.key === "ArrowLeft") updates.x = el.x - step;
            if (e.key === "ArrowRight") updates.x = el.x + step;
            updateElement(el.id, updates);
          }
        }
        return;
      }

      // Escape = deselect
      if (e.key === "Escape") {
        selectElement(null);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    selectedElementId,
    activeSlideIndex,
    slides,
    handleSave,
    undo,
    redo,
    addElement,
    duplicateSlide,
    deleteElement,
    updateElement,
    selectElement,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    groupElements,
    ungroupElement,
  ]);

  // Push history on slide count changes
  useEffect(() => {
    pushHistory();
  }, [slides.length]);

  // Client-side generation (fallback)
  const handleGenerate = async (text: string) => {
    setShowGenerate(false);
    setIsGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      const generated = generateSlidesFallback(text, {
        width: settings.width,
        height: settings.height,
      });
      setSlides(generated);
      const coverText = generated[0]?.elements.find(
        (e) => e.type === "text",
      );
      if (coverText?.content) {
        setTitle(coverText.content);
      }
    } catch (err) {
      console.error("Generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Translate all slides to English
  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const res = await fetch("./api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides, targetLang: "American English" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.slides) {
          pushHistory();
          setSlides(data.slides);
        }
      }
    } catch (err) {
      console.error("Translation failed:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Apply brand kit colors to all slides
  const handleApplyBrandKit = (kitId: string) => {
    const kit = guestStorage.getBrandKit(kitId);
    if (!kit) return;
    pushHistory();
    const bgPalette = [
      kit.backgroundColor || "#FFFFFF",
      kit.primaryColor || "#1A1A2E",
      kit.backgroundColor || "#FFFFFF",
      kit.secondaryColor || "#6366F1",
      kit.backgroundColor || "#FFFFFF",
      kit.accentColor || "#F59E0B",
      kit.backgroundColor || "#FFFFFF",
      kit.primaryColor || "#1A1A2E",
      kit.primaryColor || "#1A1A2E",
    ];
    function getContrast(bgHex: string): string {
      const hex = bgHex.replace("#", "");
      const r = parseInt(hex.substr(0, 2), 16) || 0;
      const g = parseInt(hex.substr(2, 2), 16) || 0;
      const b = parseInt(hex.substr(4, 2), 16) || 0;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return lum > 0.5 ? "#1A1A2E" : "#FFFFFF";
    }
    const newSlides = slides.map((slide, i) => {
      const bg = bgPalette[i % bgPalette.length];
      const txtColor = getContrast(bg);
      return {
        ...slide,
        backgroundColor: bg,
        elements: slide.elements.map((el) => {
          if (el.type === "text") {
            return {
              ...el,
              style: {
                ...el.style,
                color: txtColor,
                fontFamily: el.style.fontWeight && el.style.fontWeight >= 700
                  ? kit.headingFont || el.style.fontFamily
                  : kit.bodyFont || el.style.fontFamily,
              },
            };
          }
          return el;
        }),
      };
    });
    setSlides(newSlides);
  };

  const activeSlide = slides[activeSlideIndex];
  const thumbnailScale = Math.min(
    140 / settings.width,
    200 / settings.height,
    0.15,
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* ═══ TOP TOOLBAR ═══ */}
      <header className="h-12 border-b bg-card flex items-center px-3 gap-2 shrink-0 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 w-48 border-0 font-medium focus-visible:ring-1"
          data-testid="input-title"
        />

        <Separator orientation="vertical" className="h-6" />

        {/* Format selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5"
              data-testid="button-format"
            >
              <RectangleHorizontal className="w-3.5 h-3.5" />
              {settings.width}x{settings.height}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {FORMAT_PRESETS.map((preset) => (
              <DropdownMenuItem
                key={preset.id}
                onClick={() =>
                  setSettings({
                    width: preset.width,
                    height: preset.height,
                    platform: preset.platform,
                  })
                }
                className={
                  settings.width === preset.width &&
                  settings.height === preset.height
                    ? "bg-accent"
                    : ""
                }
                data-testid={`format-editor-${preset.id}`}
              >
                <span className="flex-1">{preset.name}</span>
                <span className="text-xs text-muted-foreground ml-3">
                  {preset.width}x{preset.height}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Brand kit apply */}
        {editorBrandKits.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1.5"
                data-testid="button-brand-kit"
              >
                <Palette className="w-3.5 h-3.5" />
                Charte
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {editorBrandKits.map((kit) => (
                <DropdownMenuItem
                  key={kit.id}
                  onClick={() => handleApplyBrandKit(kit.id)}
                  data-testid={`brandkit-${kit.id}`}
                >
                  <span className="w-3 h-3 rounded-full mr-2 shrink-0" style={{ backgroundColor: kit.primaryColor }} />
                  <span className="flex-1">{kit.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Brand kit images */}
        {editorBrandKits.some(k => (k.images?.length ?? 0) > 0) && (
          <DropdownMenu open={brandKitImagesOpen} onOpenChange={setBrandKitImagesOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                Images
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 p-2">
              {editorBrandKits.length > 1 && (
                <div className="flex gap-1 mb-2 flex-wrap">
                  {editorBrandKits.map(k => (
                    <button
                      key={k.id}
                      className={`text-xs px-2 py-0.5 rounded border ${activeBrandKitForImages === k.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}
                      onClick={() => setActiveBrandKitForImages(k.id)}
                    >
                      {k.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-4 gap-1.5">
                {(activeBrandKitForImages ? guestStorage.getBrandKitImages(activeBrandKitForImages) : []).map((img: BrandKitImage) => (
                  <button
                    key={img.id}
                    className="aspect-square rounded overflow-hidden border border-border hover:border-primary transition-colors"
                    title={img.name}
                    onClick={() => {
                      pushHistory();
                      addElement(createImageElement(img.dataUrl));
                      setBrandKitImagesOpen(false);
                    }}
                  >
                    <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              {activeBrandKitForImages && guestStorage.getBrandKitImages(activeBrandKitForImages).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">Aucune image dans cette charte</p>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Translate */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={handleTranslate}
          disabled={isTranslating}
          data-testid="button-translate"
        >
          {isTranslating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Languages className="w-3.5 h-3.5" />
          )}
          {isTranslating ? "Traduction..." : "EN-US"}
        </Button>

        <div className="flex-1" />

        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="icon"
          onClick={undo}
          data-testid="button-undo"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={redo}
          data-testid="button-redo"
        >
          <Redo2 className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Save status */}
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {isSaving ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" /> Sauvegarde...
            </>
          ) : isDirty ? (
            "Non sauvegarde"
          ) : lastSavedAt ? (
            <>
              <Check className="w-3 h-3" /> Sauvegarde
            </>
          ) : null}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          data-testid="button-save"
        >
          <Save className="w-4 h-4 mr-1.5" />
          Sauvegarder
        </Button>

        {/* Save as template */}
        <Dialog
          open={showSaveTemplate}
          onOpenChange={setShowSaveTemplate}
        >
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              data-testid="button-save-template"
            >
              <BookTemplate className="w-4 h-4 mr-1.5" />
              Sauvegarder template
            </Button>
          </DialogTrigger>
          <SaveTemplateDialog
            slides={slides}
            settings={settings}
            onClose={() => setShowSaveTemplate(false)}
          />
        </Dialog>

        {/* Export */}
        <Dialog open={showExport} onOpenChange={setShowExport}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-export">
              <Download className="w-4 h-4 mr-1.5" />
              Exporter
            </Button>
          </DialogTrigger>
          <ExportDialog slides={slides} settings={settings} />
        </Dialog>
      </header>

      {/* ═══ MAIN AREA ═══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ═══ LEFT PANEL — Slide Thumbnails ═══ */}
        <div className="w-48 border-r bg-card flex flex-col shrink-0">
          <div className="p-2 border-b flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Slides ({slides.length})
            </span>
            <div className="flex items-center gap-0.5">
              <Dialog
                open={showGenerate}
                onOpenChange={setShowGenerate}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    data-testid="button-ai-generate"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </DialogTrigger>
                <GenerateDialog onGenerate={handleGenerate} />
              </Dialog>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => addSlide()}
                data-testid="button-add-slide"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`group relative rounded-md cursor-pointer border-2 transition-colors ${
                  index === activeSlideIndex
                    ? "border-primary"
                    : "border-transparent hover:border-muted-foreground/20"
                }`}
                onClick={() => setActiveSlide(index)}
                data-testid={`slide-thumb-${index}`}
              >
                <div className="relative overflow-hidden rounded-sm">
                  <div className="text-[8px] absolute top-0.5 left-1 text-muted-foreground z-10 font-medium">
                    {index + 1}
                  </div>
                  <SlideRenderer
                    slide={slide}
                    scale={thumbnailScale}
                    slideWidth={settings.width}
                    slideHeight={settings.height}
                  />
                </div>
                {/* Hover actions */}
                <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 flex gap-0.5">
                  <button
                    className="p-0.5 rounded bg-background/80"
                    title="Telecharger cette slide"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const res = await fetch("./api/export", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            slides: [slide],
                            settings,
                            format: "jpeg",
                            pixelRatio: 2,
                          }),
                        });
                        if (!res.ok) return;
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `slide-${index + 1}.jpeg`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error("Download failed:", err);
                      }
                    }}
                  >
                    <Download className="w-2.5 h-2.5" />
                  </button>
                  <button
                    className="p-0.5 rounded bg-background/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateSlide(index);
                    }}
                  >
                    <Copy className="w-2.5 h-2.5" />
                  </button>
                  {slides.length > 1 && (
                    <button
                      className="p-0.5 rounded bg-background/80 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSlide(index);
                      }}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ CENTER — Canvas ═══ */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Element toolbar */}
          <div className="h-10 border-b bg-card/50 flex items-center px-3 gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                pushHistory();
                addElement(createTextElement("Nouveau texte"));
              }}
              data-testid="button-add-text"
            >
              <Type className="w-3.5 h-3.5 mr-1" />
              Texte
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement)
                    .files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    pushHistory();
                    addElement(
                      createImageElement(reader.result as string),
                    );
                  };
                  reader.readAsDataURL(file);
                };
                input.click();
              }}
              data-testid="button-add-image"
            >
              <ImageIcon className="w-3.5 h-3.5 mr-1" />
              Image
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                pushHistory();
                addElement({
                  id: crypto.randomUUID(),
                  type: "shape",
                  x: 200,
                  y: 200,
                  width: 300,
                  height: 300,
                  rotation: 0,
                  locked: false,
                  visible: true,
                  zIndex: 0,
                  style: {
                    backgroundColor: "#6366F1",
                    borderRadius: 0,
                    opacity: 1,
                  },
                });
              }}
              data-testid="button-add-shape"
            >
              <Square className="w-3.5 h-3.5 mr-1" />
              Forme
            </Button>

            {selectedElementIds.length >= 2 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { pushHistory(); groupElements(selectedElementIds); }}>
                <Group className="w-3.5 h-3.5 mr-1" /> Grouper
              </Button>
            )}
            {selectedElementId && slides[activeSlideIndex]?.elements.find(el => el.id === selectedElementId)?.type === "group" && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { pushHistory(); ungroupElement(selectedElementId); }}>
                <Ungroup className="w-3.5 h-3.5 mr-1" /> Degrouper
              </Button>
            )}

            <div className="flex-1" />

            {/* Slide navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  activeSlideIndex > 0 &&
                  setActiveSlide(activeSlideIndex - 1)
                }
                disabled={activeSlideIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
                {activeSlideIndex + 1} / {slides.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  activeSlideIndex < slides.length - 1 &&
                  setActiveSlide(activeSlideIndex + 1)
                }
                disabled={activeSlideIndex === slides.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Canvas area */}
          <div
            ref={containerRef}
            className="flex-1 overflow-auto flex items-center justify-center bg-muted/30"
          >
            {activeSlide && (
              <SlideRenderer
                slide={activeSlide}
                scale={canvasScale}
                slideWidth={settings.width}
                slideHeight={settings.height}
                isActive
                selectedElementId={selectedElementId}
                onSelectElement={(id) => {
                  if (shiftHeldRef.current && id) {
                    toggleSelectElement(id);
                  } else {
                    selectElement(id);
                  }
                }}
                onUpdateElement={(elId, updates) =>
                  updateElement(elId, updates)
                }
                interactive
              />
            )}
          </div>
        </div>

        {/* ═══ RIGHT PANEL — Properties ═══ */}
        <div className="w-64 border-l bg-card shrink-0 overflow-hidden">
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}
