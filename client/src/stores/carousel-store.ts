import { create } from "zustand";
import {
  Slide,
  SlideElement,
  CarouselSettings,
  DEFAULT_SETTINGS,
  createDefaultSlide,
} from "@/types/carousel";

interface HistoryEntry {
  slides: Slide[];
  activeSlideIndex: number;
}

interface CarouselState {
  carouselId: string | null;
  title: string;
  slides: Slide[];
  settings: CarouselSettings;
  brandKitId: number | null;
  activeSlideIndex: number;
  selectedElementId: string | null;
  selectedElementIds: string[]; // multi-select
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  history: HistoryEntry[];
  historyIndex: number;

  // Actions — carousel
  setCarousel: (id: string | number, title: string, slides: Slide[], settings: CarouselSettings, brandKitId: number | null) => void;
  setTitle: (title: string) => void;
  setSettings: (settings: Partial<CarouselSettings>) => void;
  setBrandKitId: (id: number | null) => void;

  // Actions — slides
  setActiveSlide: (index: number) => void;
  addSlide: (slide?: Partial<Slide>) => void;
  duplicateSlide: (index: number) => void;
  deleteSlide: (index: number) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  updateSlide: (index: number, updates: Partial<Slide>) => void;
  setSlides: (slides: Slide[]) => void;

  // Actions — elements
  selectElement: (elementId: string | null) => void;
  toggleSelectElement: (elementId: string) => void; // Shift+click multi-select
  addElement: (element: SlideElement) => void;
  updateElement: (elementId: string, updates: Partial<SlideElement>) => void;
  updateElementStyle: (elementId: string, style: Partial<SlideElement["style"]>) => void;
  deleteElement: (elementId: string) => void;
  reorderElements: (fromIndex: number, toIndex: number) => void;

  // Actions — groups
  groupElements: (elementIds: string[]) => void;
  ungroupElement: (groupId: string) => void;

  // Actions — layers
  bringForward: (elementId: string) => void;
  sendBackward: (elementId: string) => void;
  bringToFront: (elementId: string) => void;
  sendToBack: (elementId: string) => void;

  // Actions — save state
  markDirty: () => void;
  markSaved: () => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

const MAX_HISTORY = 50;

function reindexZIndex(elements: SlideElement[]): SlideElement[] {
  return elements.map((el, i) => ({ ...el, zIndex: i }));
}

export const useCarouselStore = create<CarouselState>((set, get) => ({
  carouselId: null,
  title: "Sans titre",
  slides: [createDefaultSlide(0, "cover")],
  settings: DEFAULT_SETTINGS,
  brandKitId: null,
  activeSlideIndex: 0,
  selectedElementId: null,
  selectedElementIds: [],
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  history: [],
  historyIndex: -1,

  setCarousel: (id, title, slides, settings, brandKitId) =>
    set({
      carouselId: String(id),
      title,
      slides: slides.length > 0 ? slides : [createDefaultSlide(0, "cover")],
      settings,
      brandKitId,
      activeSlideIndex: 0,
      selectedElementId: null,
      isDirty: false,
      history: [],
      historyIndex: -1,
    }),

  setTitle: (title) => set({ title, isDirty: true }),
  setSettings: (updates) => set((s) => ({ settings: { ...s.settings, ...updates }, isDirty: true })),
  setBrandKitId: (id) => set({ brandKitId: id, isDirty: true }),
  setActiveSlide: (index) => set({ activeSlideIndex: index, selectedElementId: null }),

  addSlide: (partial) =>
    set((s) => {
      const order = s.slides.length;
      const newSlide: Slide = { ...createDefaultSlide(order), ...partial, order };
      const slides = [...s.slides, newSlide];
      return { slides, activeSlideIndex: slides.length - 1, isDirty: true };
    }),

  duplicateSlide: (index) =>
    set((s) => {
      const source = s.slides[index];
      if (!source) return s;
      const dup: Slide = { ...JSON.parse(JSON.stringify(source)), id: crypto.randomUUID(), order: index + 1 };
      const slides = [...s.slides];
      slides.splice(index + 1, 0, dup);
      slides.forEach((sl, i) => (sl.order = i));
      return { slides, activeSlideIndex: index + 1, isDirty: true };
    }),

  deleteSlide: (index) =>
    set((s) => {
      if (s.slides.length <= 1) return s;
      const slides = s.slides.filter((_, i) => i !== index);
      slides.forEach((sl, i) => (sl.order = i));
      return { slides, activeSlideIndex: Math.min(s.activeSlideIndex, slides.length - 1), selectedElementId: null, isDirty: true };
    }),

  reorderSlides: (fromIndex, toIndex) =>
    set((s) => {
      const slides = [...s.slides];
      const [moved] = slides.splice(fromIndex, 1);
      slides.splice(toIndex, 0, moved);
      slides.forEach((sl, i) => (sl.order = i));
      return { slides, activeSlideIndex: toIndex, isDirty: true };
    }),

  updateSlide: (index, updates) =>
    set((s) => {
      const slides = [...s.slides];
      slides[index] = { ...slides[index], ...updates };
      return { slides, isDirty: true };
    }),

  setSlides: (slides) => set({ slides, activeSlideIndex: 0, selectedElementId: null, isDirty: true }),
  selectElement: (elementId) => set({ selectedElementId: elementId, selectedElementIds: elementId ? [elementId] : [] }),

  toggleSelectElement: (elementId) =>
    set((s) => {
      const ids = s.selectedElementIds.includes(elementId)
        ? s.selectedElementIds.filter((id) => id !== elementId)
        : [...s.selectedElementIds, elementId];
      return {
        selectedElementIds: ids,
        selectedElementId: ids.length === 1 ? ids[0] : (ids.length > 1 ? ids[ids.length - 1] : null),
      };
    }),

  addElement: (element) =>
    set((s) => {
      const slides = [...s.slides];
      const slide = { ...slides[s.activeSlideIndex] };
      const maxZ = slide.elements.reduce((m, el) => Math.max(m, el.zIndex ?? 0), 0);
      slide.elements = [...slide.elements, { ...element, zIndex: maxZ + 1 }];
      slides[s.activeSlideIndex] = slide;
      return { slides, selectedElementId: element.id, isDirty: true };
    }),

  updateElement: (elementId, updates) =>
    set((s) => ({
      slides: s.slides.map((slide) => ({
        ...slide,
        elements: slide.elements.map((el) => el.id === elementId ? { ...el, ...updates } : el),
      })),
      isDirty: true,
    })),

  updateElementStyle: (elementId, style) =>
    set((s) => ({
      slides: s.slides.map((slide) => ({
        ...slide,
        elements: slide.elements.map((el) =>
          el.id === elementId ? { ...el, style: { ...el.style, ...style } } : el
        ),
      })),
      isDirty: true,
    })),

  deleteElement: (elementId) =>
    set((s) => ({
      slides: s.slides.map((slide) => ({
        ...slide,
        elements: slide.elements.filter((el) => el.id !== elementId),
      })),
      selectedElementId: s.selectedElementId === elementId ? null : s.selectedElementId,
      isDirty: true,
    })),

  reorderElements: (fromIndex, toIndex) =>
    set((s) => {
      const slides = [...s.slides];
      const slide = { ...slides[s.activeSlideIndex] };
      const elements = [...slide.elements];
      const [moved] = elements.splice(fromIndex, 1);
      elements.splice(toIndex, 0, moved);
      slide.elements = reindexZIndex(elements);
      slides[s.activeSlideIndex] = slide;
      return { slides, isDirty: true };
    }),

  // ─── Group actions ──────────────────────────────────
  groupElements: (elementIds) =>
    set((s) => {
      if (elementIds.length < 2) return s;
      const slides = [...s.slides];
      const slide = { ...slides[s.activeSlideIndex] };
      const toGroup = slide.elements.filter((el) => elementIds.includes(el.id));
      if (toGroup.length < 2) return s;

      const minX = Math.min(...toGroup.map((el) => el.x));
      const minY = Math.min(...toGroup.map((el) => el.y));
      const maxX = Math.max(...toGroup.map((el) => el.x + el.width));
      const maxY = Math.max(...toGroup.map((el) => el.y + el.height));
      const maxZ = Math.max(...toGroup.map((el) => el.zIndex ?? 0));

      const children: SlideElement[] = toGroup.map((el) => ({
        ...el,
        x: el.x - minX,
        y: el.y - minY,
      }));

      const group: SlideElement = {
        id: crypto.randomUUID(),
        type: "group",
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        rotation: 0,
        locked: false,
        visible: true,
        zIndex: maxZ + 1,
        style: {},
        children,
        groupAutoLayout: false,
      };

      slide.elements = [
        ...slide.elements.filter((el) => !elementIds.includes(el.id)),
        group,
      ];
      slide.elements = reindexZIndex(slide.elements);
      slides[s.activeSlideIndex] = slide;
      return { slides, selectedElementId: group.id, selectedElementIds: [group.id], isDirty: true };
    }),

  ungroupElement: (groupId) =>
    set((s) => {
      const slides = [...s.slides];
      const slide = { ...slides[s.activeSlideIndex] };
      const group = slide.elements.find((el) => el.id === groupId);
      if (!group || group.type !== "group" || !group.children) return s;

      const restored: SlideElement[] = group.children.map((child) => ({
        ...child,
        x: child.x + group.x,
        y: child.y + group.y,
      }));

      slide.elements = [
        ...slide.elements.filter((el) => el.id !== groupId),
        ...restored,
      ];
      slide.elements = reindexZIndex(slide.elements);
      slides[s.activeSlideIndex] = slide;
      return { slides, selectedElementId: null, selectedElementIds: restored.map((el) => el.id), isDirty: true };
    }),

  // ─── Layer actions ──────────────────────────────────
  bringForward: (elementId) =>
    set((s) => {
      const slides = [...s.slides];
      const slide = { ...slides[s.activeSlideIndex] };
      const sorted = [...slide.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
      const idx = sorted.findIndex((el) => el.id === elementId);
      if (idx < sorted.length - 1) {
        [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
      }
      slide.elements = reindexZIndex(sorted);
      slides[s.activeSlideIndex] = slide;
      return { slides, isDirty: true };
    }),

  sendBackward: (elementId) =>
    set((s) => {
      const slides = [...s.slides];
      const slide = { ...slides[s.activeSlideIndex] };
      const sorted = [...slide.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
      const idx = sorted.findIndex((el) => el.id === elementId);
      if (idx > 0) {
        [sorted[idx], sorted[idx - 1]] = [sorted[idx - 1], sorted[idx]];
      }
      slide.elements = reindexZIndex(sorted);
      slides[s.activeSlideIndex] = slide;
      return { slides, isDirty: true };
    }),

  bringToFront: (elementId) =>
    set((s) => {
      const slides = [...s.slides];
      const slide = { ...slides[s.activeSlideIndex] };
      const sorted = [...slide.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
      const idx = sorted.findIndex((el) => el.id === elementId);
      if (idx >= 0) {
        const [el] = sorted.splice(idx, 1);
        sorted.push(el);
      }
      slide.elements = reindexZIndex(sorted);
      slides[s.activeSlideIndex] = slide;
      return { slides, isDirty: true };
    }),

  sendToBack: (elementId) =>
    set((s) => {
      const slides = [...s.slides];
      const slide = { ...slides[s.activeSlideIndex] };
      const sorted = [...slide.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
      const idx = sorted.findIndex((el) => el.id === elementId);
      if (idx >= 0) {
        const [el] = sorted.splice(idx, 1);
        sorted.unshift(el);
      }
      slide.elements = reindexZIndex(sorted);
      slides[s.activeSlideIndex] = slide;
      return { slides, isDirty: true };
    }),

  markDirty: () => set({ isDirty: true }),
  markSaved: () => set({ isDirty: false, isSaving: false, lastSavedAt: new Date().toISOString() }),

  pushHistory: () =>
    set((s) => {
      const entry: HistoryEntry = {
        slides: JSON.parse(JSON.stringify(s.slides)),
        activeSlideIndex: s.activeSlideIndex,
      };
      const history = s.history.slice(0, s.historyIndex + 1);
      history.push(entry);
      if (history.length > MAX_HISTORY) history.shift();
      return { history, historyIndex: history.length - 1 };
    }),

  undo: () =>
    set((s) => {
      if (s.historyIndex <= 0) return s;
      const newIndex = s.historyIndex - 1;
      const entry = s.history[newIndex];
      return { slides: JSON.parse(JSON.stringify(entry.slides)), activeSlideIndex: entry.activeSlideIndex, historyIndex: newIndex, selectedElementId: null, isDirty: true };
    }),

  redo: () =>
    set((s) => {
      if (s.historyIndex >= s.history.length - 1) return s;
      const newIndex = s.historyIndex + 1;
      const entry = s.history[newIndex];
      return { slides: JSON.parse(JSON.stringify(entry.slides)), activeSlideIndex: entry.activeSlideIndex, historyIndex: newIndex, selectedElementId: null, isDirty: true };
    }),

  reset: () =>
    set({
      carouselId: null, title: "Sans titre", slides: [createDefaultSlide(0, "cover")],
      settings: DEFAULT_SETTINGS, brandKitId: null, activeSlideIndex: 0,
      selectedElementId: null, selectedElementIds: [], isDirty: false, isSaving: false, lastSavedAt: null,
      history: [], historyIndex: -1,
    }),
}));
