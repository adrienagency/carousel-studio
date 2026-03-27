/**
 * Export engine: Slide model → Satori JSX → SVG → resvg PNG
 * 
 * Satori constraints:
 * - NO z-index (element order in JSX = paint order → sort by zIndex)
 * - NO calc(), no CSS variables
 * - position: only relative, absolute, static
 * - Fonts: TTF/OTF/WOFF only (no WOFF2), loaded as ArrayBuffer
 * - Images: prefer base64 data URIs
 * - Flexbox fully supported (Yoga engine)
 * - NO box-shadow
 */

import { loadFonts } from "./fonts";

// Dynamic imports for ESM compatibility in CJS bundle
async function getSatori() {
  const mod = await import("satori");
  return (mod as any).default || mod;
}

async function getResvg() {
  const mod = await import("@resvg/resvg-js");
  return (mod as any).Resvg || (mod as any).default?.Resvg;
}

// Types matching the client-side carousel model
interface ElementStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  color?: string;
  textAlign?: string;
  lineHeight?: number;
  letterSpacing?: number;
  objectFit?: string;
  borderRadius?: number;
  opacity?: number;
  backgroundColor?: string;
  textDecoration?: string;
  fontStyle?: string;
}

interface SlideElement {
  id: string;
  type: "text" | "image" | "shape" | "icon" | "divider";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content?: string;
  src?: string;
  visible: boolean;
  style: ElementStyle;
  zIndex?: number;
}

interface Slide {
  id: string;
  order: number;
  type: string;
  backgroundColor: string;
  backgroundImage?: string;
  elements: SlideElement[];
}

interface ExportSettings {
  width: number;
  height: number;
}

/**
 * Convert a SlideElement to a Satori-compatible JSX-like object.
 * Satori uses React.createElement-style objects:
 * { type: 'div', props: { style: {...}, children: [...] } }
 */
function elementToSatoriNode(el: SlideElement, pixelRatio: number): any {
  const baseStyle: Record<string, any> = {
    position: "absolute" as const,
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.height,
    opacity: el.style.opacity ?? 1,
  };

  if (el.rotation) {
    baseStyle.transform = `rotate(${el.rotation}deg)`;
  }

  switch (el.type) {
    case "text": {
      // Satori is strict about style values — must be explicit types
      const textStyle: Record<string, any> = {
        position: "absolute" as const,
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        fontSize: el.style.fontSize || 24,
        fontFamily: "Inter",
        fontWeight: el.style.fontWeight || 400,
        color: el.style.color || "#000000",
        lineHeight: String(el.style.lineHeight || 1.4),
        display: "flex",
        flexWrap: "wrap" as const,
        overflow: "hidden" as const,
        opacity: el.style.opacity ?? 1,
      };

      // textAlign in Satori
      if (el.style.textAlign === "center") {
        textStyle.textAlign = "center";
        textStyle.justifyContent = "center";
      } else if (el.style.textAlign === "right") {
        textStyle.textAlign = "right";
        textStyle.justifyContent = "flex-end";
      } else {
        textStyle.textAlign = "left";
      }

      if (el.style.letterSpacing && el.style.letterSpacing !== 0) {
        textStyle.letterSpacing = `${el.style.letterSpacing}em`;
      }
      if (el.style.textDecoration) {
        textStyle.textDecoration = el.style.textDecoration;
      }
      if (el.style.fontStyle) {
        textStyle.fontStyle = el.style.fontStyle;
      }

      return {
        type: "div",
        props: {
          style: textStyle,
          children: String(el.content || ""),
        },
      };
    }

    case "image": {
      if (!el.src) return null;
      
      const imgStyle: Record<string, any> = {
        ...baseStyle,
        borderRadius: el.style.borderRadius || 0,
        objectFit: el.style.objectFit || "cover",
      };

      return {
        type: "img",
        props: {
          src: el.src,
          width: el.width,
          height: el.height,
          style: imgStyle,
        },
      };
    }

    case "shape": {
      const shapeStyle: Record<string, any> = {
        ...baseStyle,
        backgroundColor: el.style.backgroundColor || "#6366F1",
        borderRadius: el.style.borderRadius || 0,
      };

      return {
        type: "div",
        props: {
          style: shapeStyle,
        },
      };
    }

    case "divider": {
      const dividerStyle: Record<string, any> = {
        position: "absolute" as const,
        left: el.x,
        top: el.y + el.height / 2,
        width: el.width,
        height: 2,
        backgroundColor: el.style.color || "#E5E7EB",
        opacity: el.style.opacity ?? 1,
      };

      return {
        type: "div",
        props: {
          style: dividerStyle,
        },
      };
    }

    default:
      return null;
  }
}

/**
 * Build the full Satori JSX tree for a slide.
 */
function slideToSatoriJSX(slide: Slide, settings: ExportSettings): any {
  // Sort elements by zIndex (ascending) — Satori paints in JSX order
  const sortedElements = [...slide.elements]
    .filter((el) => el.visible !== false)
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  const children: any[] = [];

  // Background image if present
  if (slide.backgroundImage) {
    children.push({
      type: "img",
      props: {
        src: slide.backgroundImage,
        width: settings.width,
        height: settings.height,
        style: {
          position: "absolute" as const,
          left: 0,
          top: 0,
          width: settings.width,
          height: settings.height,
          objectFit: "cover",
        },
      },
    });
  }

  // Convert each element
  for (const el of sortedElements) {
    const node = elementToSatoriNode(el, 1);
    if (node) children.push(node);
  }

  return {
    type: "div",
    props: {
      style: {
        width: settings.width,
        height: settings.height,
        backgroundColor: slide.backgroundColor || "#FFFFFF",
        position: "relative" as const,
        display: "flex",
        overflow: "hidden" as const,
      },
      children,
    },
  };
}

/**
 * Render a single slide to a PNG buffer.
 */
export async function renderSlideToImage(
  slide: Slide,
  settings: ExportSettings,
  pixelRatio: number = 2
): Promise<Buffer> {
  const fonts = await loadFonts();

  if (fonts.length === 0) {
    throw new Error("No fonts loaded — cannot render");
  }

  const jsx = slideToSatoriJSX(slide, settings);

  // Satori renders to SVG
  const satori = await getSatori();
  const svg = await satori(jsx, {
    width: settings.width,
    height: settings.height,
    fonts: fonts.map((f) => ({
      name: f.name,
      data: f.data,
      weight: f.weight as any,
      style: f.style as any,
    })),
  });

  // resvg converts SVG to PNG
  const Resvg = await getResvg();
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width" as const,
      value: settings.width * pixelRatio,
    },
  });

  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}
