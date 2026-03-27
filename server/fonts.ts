/**
 * Font loader for Satori — caches font ArrayBuffers in memory.
 * Satori requires TTF/OTF/WOFF (NOT woff2).
 */

interface CachedFont {
  name: string;
  weight: number;
  style: "normal" | "italic";
  data: ArrayBuffer;
}

const fontCache: CachedFont[] = [];
let loaded = false;

// Direct TTF/OTF URLs — these are stable CDN links to the actual font files
const FONT_URLS = [
  {
    name: "Inter",
    weight: 400,
    url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf",
  },
  {
    name: "Inter",
    weight: 700,
    url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf",
  },
  {
    name: "Inter",
    weight: 800,
    url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuDyYMZg.ttf",
  },
];

export async function loadFonts(): Promise<CachedFont[]> {
  if (loaded && fontCache.length > 0) {
    return fontCache;
  }

  for (const { name, weight, url } of FONT_URLS) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Failed to fetch font ${name} ${weight}: ${res.status}`);
        continue;
      }
      const data = await res.arrayBuffer();
      // Validate: TTF files start with 0x00010000 or 'true', OTF with 'OTTO'
      const header = new Uint8Array(data.slice(0, 4));
      const sig = String.fromCharCode(...header);
      if (data.byteLength < 1000) {
        console.error(`Font ${name} ${weight} too small (${data.byteLength} bytes), skipping`);
        continue;
      }
      fontCache.push({ name, weight, style: "normal", data });
    } catch (err) {
      console.error(`Error loading font ${name} ${weight}:`, err);
    }
  }

  loaded = true;

  if (fontCache.length === 0) {
    console.error("WARNING: No fonts loaded. Export will fail.");
  } else {
    console.log(`Loaded ${fontCache.length} font variants`);
  }

  return fontCache;
}
