# Batch 2 — Editor.tsx Modifications

## File: `/home/user/workspace/carousel-studio/client/src/pages/editor.tsx` (2355 lines)

## Changes Required

### 1. Import new components
Add at top of file:
```tsx
import { FontPicker } from "@/components/font-picker";
import { GradientPicker, gradientToCSS } from "@/components/gradient-picker";
import type { GradientConfig, ShadowConfig } from "@/types/carousel";
```

### 2. SlideRenderer — Apply gradient, shadow, blur to rendered elements

In the SlideRenderer component:

a) **Slide background gradient**: When `slide.backgroundGradient` exists, apply it as `backgroundImage` CSS in addition to `backgroundColor`:
```tsx
// In the slide-canvas div style:
backgroundImage: slide.backgroundGradient 
  ? gradientToCSS(slide.backgroundGradient)
  : slide.backgroundImage ? `url(${slide.backgroundImage})` : undefined,
```

b) **Element shadow**: In the element render div, add `boxShadow` if `element.style.shadow` exists:
```tsx
boxShadow: element.style.shadow
  ? `${element.style.shadow.x}px ${element.style.shadow.y}px ${element.style.shadow.blur}px ${element.style.shadow.spread}px ${element.style.shadow.color}`
  : undefined,
```

c) **Element blur**: Add `filter` if `element.style.filterBlur`:
```tsx
filter: element.style.filterBlur ? `blur(${element.style.filterBlur}px)` : undefined,
```

d) **Shape gradient**: For shape elements, if `element.style.gradient` exists, use it as background instead of backgroundColor.

e) **Text hyphens + justify**: In text rendering, add:
```tsx
hyphens: element.style.hyphens ? "auto" : undefined,
WebkitHyphens: element.style.hyphens ? "auto" : undefined,
textAlign: element.style.textAlign || "left",
// justify is already in the textAlign union type
```
Also add `lang="fr"` to the text div when hyphens is enabled (required for hyphens to work).

f) **Text auto-height**: After rendering text, if `element.style.textAutoHeight` is true, the element height should be `auto` instead of fixed. This means:
- In positionStyle for non-auto-layout: use `height: "auto"` and `minHeight: element.height * scale` if textAutoHeight is true
- In the textarea during editing: also adapt

### 3. PropertiesPanel — Add new controls

#### 3a. Replace font family Input with FontPicker
Find the font family input (around line 940) and replace:
```tsx
<Input
  value={element.style.fontFamily || "Inter"}
  onChange={(e) => updateElementStyle(element.id, { fontFamily: e.target.value })}
  className="h-8 text-xs"
  placeholder="Inter"
/>
```
With:
```tsx
<FontPicker
  value={element.style.fontFamily || "Inter"}
  onChange={(fontFamily) => updateElementStyle(element.id, { fontFamily })}
/>
```

#### 3b. Add Justify button to text alignment row
After the AlignRight button (~line 1000), add:
```tsx
<Button variant={element.style.textAlign === "justify" ? "secondary" : "ghost"} size="icon" className="h-8 w-8"
  onClick={() => updateElementStyle(element.id, { textAlign: "justify" })}>
  <AlignJustify className="w-3.5 h-3.5" />
</Button>
```
Don't forget to import `AlignJustify` from lucide-react.

#### 3c. Add Hyphens toggle after alignment
```tsx
<div className="flex items-center justify-between">
  <Label className="text-xs">Cesure</Label>
  <Switch checked={!!element.style.hyphens} onCheckedChange={(v) => updateElementStyle(element.id, { hyphens: v })} />
</div>
```

#### 3d. Add Auto-height toggle for text
```tsx
<div className="flex items-center justify-between">
  <Label className="text-xs">Hauteur auto</Label>
  <Switch checked={!!element.style.textAutoHeight} onCheckedChange={(v) => updateElementStyle(element.id, { textAutoHeight: v })} />
</div>
```

#### 3e. Add Shadow controls for ALL elements (after opacity)
```tsx
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
```

#### 3f. Add Blur control for ALL elements (after shadow)
```tsx
<div className="space-y-2">
  <Label className="text-xs">Flou ({element.style.filterBlur || 0}px)</Label>
  <Slider value={[element.style.filterBlur || 0]} onValueChange={([v]) => updateElementStyle(element.id, { filterBlur: v })} min={0} max={40} step={1} />
</div>
```

#### 3g. Add gradient controls for Slide background (in the "no element selected" panel)
After the "Couleur de fond" section and before "Image de fond", add GradientPicker:
```tsx
<GradientPicker
  value={slide.backgroundGradient}
  fallbackColor={slide.backgroundColor}
  onChange={(gradient) => updateSlide(activeSlideIndex, { backgroundGradient: gradient })}
/>
```

#### 3h. Add gradient controls for Shape elements
In the shape controls section, add GradientPicker after the backgroundColor:
```tsx
<GradientPicker
  value={element.style.gradient}
  fallbackColor={element.style.backgroundColor || "#6366F1"}
  onChange={(gradient) => updateElementStyle(element.id, { gradient })}
/>
```
