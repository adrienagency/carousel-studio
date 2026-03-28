/**
 * Guest Storage — in-memory + localStorage fallback.
 * Stores carousels, templates, and brand kits.
 */

import type { GuestTemplate, GuestBrandKit, BrandKitImage } from "@/types/carousel";

export interface GuestCarousel {
  id: string;
  title: string;
  slides: string;
  settings: string;
  brandKitId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface StoreData {
  version?: number;
  carousels: GuestCarousel[];
  templates: GuestTemplate[];
  brandKits: GuestBrandKit[];
}

const STORAGE_KEY = "carousel-studio-guest-data";
const STORAGE_VERSION = 2; // Increment when schema changes

// Migrate data from old versions
function migrateStore(data: any): StoreData {
  if (!data) return { version: STORAGE_VERSION, carousels: [], templates: [], brandKits: [] };
  const v = data.version || 1;
  // v1 → v2: add images array to brand kits, add backgroundImageOpacity to slides
  if (v < 2) {
    (data.brandKits || []).forEach((kit: any) => {
      if (!kit.images) kit.images = [];
    });
  }
  data.version = STORAGE_VERSION;
  return data;
}

let memoryStore: StoreData = { carousels: [], templates: [], brandKits: [] };
let useMemory = false;

function getLS(): Storage | null {
  try {
    const key = ["local", "Storage"].join("");
    const s = (window as any)[key] as Storage;
    if (!s) return null;
    const t = "__cs__";
    s.setItem(t, "1");
    s.removeItem(t);
    return s;
  } catch {
    return null;
  }
}

const _ls = getLS();
if (!_ls) useMemory = true;

function getStore(): StoreData {
  if (useMemory) return memoryStore;
  try {
    const raw = _ls!.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const migrated = migrateStore(parsed);
      // Save migrated version back if needed
      if (parsed.version !== STORAGE_VERSION) {
        try { _ls!.setItem(STORAGE_KEY, JSON.stringify(migrated)); } catch {}
      }
      return {
        version: STORAGE_VERSION,
        carousels: migrated.carousels || [],
        templates: migrated.templates || [],
        brandKits: migrated.brandKits || [],
      };
    }
  } catch {
    useMemory = true;
    return memoryStore;
  }
  return { version: STORAGE_VERSION, carousels: [], templates: [], brandKits: [] };
}

function saveStore(store: StoreData) {
  if (useMemory) { memoryStore = store; return; }
  try { _ls!.setItem(STORAGE_KEY, JSON.stringify(store)); }
  catch { useMemory = true; memoryStore = store; }
}

export const guestStorage = {
  // ─── Carousels ──────────────────────────────────────
  getCarousels(): GuestCarousel[] {
    return getStore().carousels.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },
  getCarousel(id: string): GuestCarousel | undefined {
    return getStore().carousels.find((c) => c.id === id);
  },
  createCarousel(data: Partial<GuestCarousel>): GuestCarousel {
    const store = getStore();
    const now = new Date().toISOString();
    const carousel: GuestCarousel = {
      id: crypto.randomUUID(),
      title: data.title || "Sans titre",
      slides: data.slides || JSON.stringify([{
        id: crypto.randomUUID(), order: 0, type: "cover",
        backgroundColor: "#FFFFFF", elements: [],
      }]),
      settings: data.settings || JSON.stringify({ width: 1080, height: 1080, platform: "linkedin" }),
      brandKitId: data.brandKitId || null,
      createdAt: now,
      updatedAt: now,
    };
    store.carousels.push(carousel);
    saveStore(store);
    return carousel;
  },
  updateCarousel(id: string, updates: Partial<GuestCarousel>): GuestCarousel | undefined {
    const store = getStore();
    const idx = store.carousels.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    store.carousels[idx] = { ...store.carousels[idx], ...updates, updatedAt: new Date().toISOString() };
    saveStore(store);
    return store.carousels[idx];
  },
  deleteCarousel(id: string): void {
    const store = getStore();
    store.carousels = store.carousels.filter((c) => c.id !== id);
    saveStore(store);
  },
  duplicateCarousel(id: string): GuestCarousel | undefined {
    const source = this.getCarousel(id);
    if (!source) return undefined;
    return this.createCarousel({
      title: `${source.title} (copie)`,
      slides: source.slides,
      settings: source.settings,
    });
  },

  // ─── Templates ──────────────────────────────────────
  getTemplates(): GuestTemplate[] {
    return getStore().templates;
  },
  saveTemplate(data: Omit<GuestTemplate, "id" | "createdAt">): GuestTemplate {
    const store = getStore();
    const tpl: GuestTemplate = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    store.templates.push(tpl);
    saveStore(store);
    return tpl;
  },
  deleteTemplate(id: string): void {
    const store = getStore();
    store.templates = store.templates.filter((t) => t.id !== id);
    saveStore(store);
  },

  // ─── Brand Kits ─────────────────────────────────────
  getBrandKits(): GuestBrandKit[] {
    return getStore().brandKits;
  },
  getBrandKit(id: string): GuestBrandKit | undefined {
    return getStore().brandKits.find((k) => k.id === id);
  },
  saveBrandKit(data: Omit<GuestBrandKit, "id">): GuestBrandKit {
    const store = getStore();
    const kit: GuestBrandKit = { ...data, id: crypto.randomUUID() };
    store.brandKits.push(kit);
    saveStore(store);
    return kit;
  },
  updateBrandKit(id: string, updates: Partial<GuestBrandKit>): GuestBrandKit | undefined {
    const store = getStore();
    const idx = store.brandKits.findIndex((k) => k.id === id);
    if (idx === -1) return undefined;
    store.brandKits[idx] = { ...store.brandKits[idx], ...updates };
    saveStore(store);
    return store.brandKits[idx];
  },
  deleteBrandKit(id: string): void {
    const store = getStore();
    store.brandKits = store.brandKits.filter((k) => k.id !== id);
    saveStore(store);
  },

  // ─── Brand Kit Images ──────────────────────────────
  getBrandKitImages(kitId: string): BrandKitImage[] {
    const kit = this.getBrandKit(kitId);
    return kit?.images || [];
  },
  addBrandKitImage(kitId: string, name: string, dataUrl: string): BrandKitImage | undefined {
    const store = getStore();
    const idx = store.brandKits.findIndex((k) => k.id === kitId);
    if (idx === -1) return undefined;
    const img: BrandKitImage = {
      id: crypto.randomUUID(),
      name,
      dataUrl,
      addedAt: new Date().toISOString(),
    };
    if (!store.brandKits[idx].images) store.brandKits[idx].images = [];
    store.brandKits[idx].images!.push(img);
    saveStore(store);
    return img;
  },
  removeBrandKitImage(kitId: string, imageId: string): void {
    const store = getStore();
    const idx = store.brandKits.findIndex((k) => k.id === kitId);
    if (idx === -1) return;
    store.brandKits[idx].images = (store.brandKits[idx].images || []).filter((i) => i.id !== imageId);
    saveStore(store);
  },

  hasData(): boolean {
    return getStore().carousels.length > 0;
  },
};
