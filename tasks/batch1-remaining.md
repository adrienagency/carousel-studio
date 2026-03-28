# Batch 1 — Remaining Tasks

## B3: Translate Button (EN-US) in Editor Toolbar

Add a translate button in the editor's top element toolbar (line ~2066 area of editor.tsx, after the Forme button). 

Implementation:
- Add `Languages` icon import from lucide-react
- Add a state `[isTranslating, setIsTranslating]` in EditorPage
- Add a button in the element toolbar (the `h-10 border-b` bar at line 1995) after the "Forme" button
- On click: call `POST /api/translate` with `{ slides, targetLang: "American English" }`
- On success: call `setSlides(data.slides)` to replace all slide text with translated versions
- Show loading spinner while translating
- The endpoint is already implemented in server/routes.ts

## B4: Fix Slide Type Switch

The Select for slide type in PropertiesPanel (line ~561) might not update visually when the underlying slide.type changes. This is because the `Select` component uses `value={slide.type}` but when `updateSlide` is called, the component might not re-render properly.

The fix: ensure the Select `key` forces re-render when the slide changes. Add `key={slide.id + '-type'}` to the Select component.

Also add `key={`slide-${slide.id}`}` to the top div of the PropertiesPanel return when no element selected, to force remount on slide change.

## B2: Brand Kit Selector in Editor

Add a brand kit dropdown in the editor toolbar (top header bar). When a brand kit is selected, apply its colors to all slides.

Implementation:
- Import `guestStorage` and `Palette` icon
- Add state `[activeBrandKit, setActiveBrandKit]` in EditorPage
- Add a small dropdown in the top toolbar (after format selector, before the flex-1 spacer)
- When user selects a brand kit: apply primaryColor, secondaryColor to slide backgrounds in an alternating pattern, and update text colors for contrast
- Use a DropdownMenu similar to the format selector

## B14: Images Full Width in Auto-Layout

When a slide has `autoLayout: true`, image elements should fill the full width of the auto-layout container.

Fix in SlideRenderer:
- When `isAutoLayout` is true and element type is "image", set width to 100% instead of using `element.width * scale`
- In the positionStyle for auto-layout mode, if the element is an image, use `width: "100%"` and maintain aspect ratio
