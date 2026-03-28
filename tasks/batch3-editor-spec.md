# Batch 3 — Editor.tsx Modifications

## File: `/home/user/workspace/carousel-studio/client/src/pages/editor.tsx`

Read the full file first (it's ~2500 lines). Apply changes surgically with the `edit` tool.

## Changes Required

### 1. Import new store actions
Add `groupElements`, `ungroupElement`, `toggleSelectElement`, `selectedElementIds` to the destructured store in EditorPage component.
Add `Group, Ungroup` icons from lucide-react.
Add `BrandKitImage` from types.

### 2. SlideRenderer — Render group elements
In the `sortedElements.map()` loop, add a case for `element.type === "group"`. A group renders as a div container with its children rendered inside:

```tsx
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
        // Render child elements with relative positioning if auto-layout, else absolute
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
        // Render child content (text, image, shape) same as main elements
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
```

### 3. Shift+click for multi-select
In the `handleMouseDown` callback in SlideRenderer, detect if Shift is held:
```tsx
// Modify handleMouseDown:
if (e.shiftKey) {
  toggleSelectElement(element.id);
  return;
}
```
This requires passing `toggleSelectElement` as a prop to SlideRenderer, or having EditorPage handle it.

The simpler approach: in EditorPage's `onSelectElement` callback, check if shift is held. Update the onSelectElement call in the canvas:
```tsx
onSelectElement={(id) => {
  // Check if shift is held via a ref
  if (shiftHeldRef.current && id) {
    toggleSelectElement(id);
  } else {
    selectElement(id);
  }
}}
```
Add a `shiftHeldRef` that tracks whether shift is pressed via keydown/keyup listeners.

### 4. Group/Ungroup buttons in toolbar
In the element toolbar (h-10 border-b bar), add Group and Ungroup buttons:
```tsx
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
```

### 5. Ctrl+G / Ctrl+Shift+G keyboard shortcuts
Add in the keyboard handler:
- Ctrl+G = group selected elements
- Ctrl+Shift+G = ungroup selected group

### 6. PropertiesPanel — Group properties
When a group element is selected, show group-specific controls:
```tsx
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
```

### 7. Brand kit images in editor toolbar
Add a dropdown button in the toolbar for brand kit images. When clicked, show a grid of thumbnails from the active brand kit. Clicking an image inserts it as a new image element.

This requires:
- Getting brand kit images from guestStorage
- A state to track which brand kit is active (or show all)
- A popover/dropdown with image thumbnails
