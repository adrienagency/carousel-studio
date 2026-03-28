import type { Slide, SlideElement } from "@/types/carousel";

export interface GeneratorOptions {
  width: number;
  height: number;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  headingFont?: string;
  bodyFont?: string;
}

function splitIntoSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 3);
}

function splitIntoParagraphs(text: string): string[] {
  return text.split(/\n\s*\n|\n/).map((p) => p.trim()).filter((p) => p.length > 5);
}

function truncate(str: string, maxWords: number): string {
  const words = str.split(/\s+/);
  if (words.length <= maxWords) return str;
  return words.slice(0, maxWords).join(" ") + "...";
}

function getContrastColor(bgHex: string): string {
  const hex = bgHex.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16) || 0;
  const g = parseInt(hex.substr(2, 2), 16) || 0;
  const b = parseInt(hex.substr(4, 2), 16) || 0;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5 ? "#1A1A2E" : "#FFFFFF";
}

function makeTextElement(
  content: string,
  opts: {
    x: number; y: number; width: number; height: number;
    fontSize: number; fontWeight: number; fontFamily: string;
    color: string; textAlign: "left" | "center" | "right";
    lineHeight?: number; letterSpacing?: number;
  }
): SlideElement {
  return {
    id: crypto.randomUUID(),
    type: "text",
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    rotation: 0,
    content,
    locked: false,
    visible: true,
    zIndex: 0,
    style: {
      fontSize: opts.fontSize,
      fontFamily: opts.fontFamily,
      fontWeight: opts.fontWeight,
      color: opts.color,
      textAlign: opts.textAlign,
      lineHeight: opts.lineHeight ?? 1.3,
      letterSpacing: opts.letterSpacing ?? 0,
      textAutoHeight: true,
    },
  };
}

export function generateSlidesFallback(text: string, options: GeneratorOptions): Slide[] {
  const { width, height } = options;
  const bg = options.backgroundColor || "#FFFFFF";
  const color = options.primaryColor || "#1A1A2E";
  const hFont = options.headingFont || "Inter";
  const bFont = options.bodyFont || "Inter";
  const padX = Math.round(width * 0.074);
  const contentW = width - padX * 2;

  const scale = width / 1080;
  // Font sizes +30% for readability
  const titleSize = Math.round(72 * scale);
  const subtitleSize = Math.round(36 * scale);
  const bodySize = Math.round(32 * scale);
  const ctaSize = Math.round(48 * scale);

  // Brand color palette for alternating slide backgrounds
  const secondary = options.secondaryColor || "#6366F1";
  const accent = options.accentColor || "#F59E0B";
  const bgPalette = [bg, color, bg, secondary, bg, accent, bg, color, color];

  const paragraphs = splitIntoParagraphs(text);
  const sentences = splitIntoSentences(text);
  const chunks = paragraphs.length >= 3 ? paragraphs : sentences;

  const coverTitle = truncate(chunks[0] || "Mon Carrousel", 8);
  const coverSubtitle = chunks.length > 1 ? truncate(chunks[1], 15) : "Decouvrez les points cles";

  const contentChunks = chunks.slice(2);
  const maxContent = Math.min(contentChunks.length, 7);
  const contentSlides: { title: string; body: string }[] = [];

  for (let i = 0; i < maxContent; i++) {
    const chunk = contentChunks[i];
    const cs = splitIntoSentences(chunk);
    const title = truncate(cs[0] || chunk, 6);
    const body = cs.length > 1 ? truncate(cs.slice(1).join(" "), 30) : truncate(chunk, 30);
    contentSlides.push({ title, body });
  }

  while (contentSlides.length < 3) {
    contentSlides.push({ title: `Point cle ${contentSlides.length + 1}`, body: truncate(text, 30) });
  }

  const slides: Slide[] = [];

  // COVER
  const cBg = bgPalette[0];
  const cTxt = getContrastColor(cBg);
  const cMuted = cTxt === "#FFFFFF" ? "#FFFFFFAA" : "#1A1A2E99";
  const coverY = Math.round(height * 0.35);
  slides.push({
    id: crypto.randomUUID(), order: 0, type: "cover", backgroundColor: cBg,
    elements: [
      makeTextElement(coverTitle, {
        x: padX, y: coverY, width: contentW, height: Math.round(220 * scale),
        fontSize: titleSize, fontWeight: 800, fontFamily: hFont,
        color: cTxt, textAlign: "center", lineHeight: 1.15, letterSpacing: -0.02,
      }),
      makeTextElement(coverSubtitle, {
        x: padX, y: coverY + Math.round(240 * scale), width: contentW, height: Math.round(100 * scale),
        fontSize: subtitleSize, fontWeight: 400, fontFamily: bFont,
        color: cMuted, textAlign: "center",
      }),
    ],
  });

  // CONTENT SLIDES
  contentSlides.forEach((cs, i) => {
    const sBg = bgPalette[(i + 1) % bgPalette.length] || bg;
    const sTxt = getContrastColor(sBg);
    const sMuted = sTxt === "#FFFFFF" ? "#FFFFFF44" : color + "22";
    const sBody = sTxt === "#FFFFFF" ? "#FFFFFFCC" : color + "CC";
    slides.push({
      id: crypto.randomUUID(), order: i + 1, type: "content", backgroundColor: sBg,
      elements: [
        makeTextElement(`${String(i + 1).padStart(2, "0")}`, {
          x: padX, y: Math.round(height * 0.07), width: Math.round(100 * scale), height: Math.round(80 * scale),
          fontSize: Math.round(62 * scale), fontWeight: 800, fontFamily: hFont,
          color: sMuted, textAlign: "left",
        }),
        makeTextElement(cs.title, {
          x: padX, y: Math.round(height * 0.18), width: contentW, height: Math.round(150 * scale),
          fontSize: Math.round(52 * scale), fontWeight: 700, fontFamily: hFont,
          color: sTxt, textAlign: "left", lineHeight: 1.2, letterSpacing: -0.01,
        }),
        { id: crypto.randomUUID(), type: "shape" as const, x: padX, y: Math.round(height * 0.36),
          width: Math.round(60 * scale), height: Math.round(4 * scale), rotation: 0,
          locked: false, visible: true, zIndex: 0,
          style: { backgroundColor: sTxt, borderRadius: 2, opacity: 0.3 } },
        makeTextElement(cs.body, {
          x: padX, y: Math.round(height * 0.42), width: contentW, height: Math.round(280 * scale),
          fontSize: bodySize, fontWeight: 400, fontFamily: bFont,
          color: sBody, textAlign: "left", lineHeight: 1.6,
        }),
      ],
    });
  });

  // END SLIDE
  const eBg = bgPalette[slides.length % bgPalette.length] || color;
  const eTxt = getContrastColor(eBg);
  const eMuted = eTxt === "#FFFFFF" ? "#FFFFFF88" : color + "88";
  const endY = Math.round(height * 0.35);
  slides.push({
    id: crypto.randomUUID(), order: slides.length, type: "end", backgroundColor: eBg,
    elements: [
      makeTextElement("Merci !", {
        x: padX, y: endY, width: contentW, height: Math.round(150 * scale),
        fontSize: titleSize, fontWeight: 800, fontFamily: hFont,
        color: eTxt, textAlign: "center", lineHeight: 1.2,
      }),
      makeTextElement("Suivez-moi pour plus de contenu", {
        x: padX, y: endY + Math.round(180 * scale), width: contentW, height: Math.round(80 * scale),
        fontSize: subtitleSize, fontWeight: 400, fontFamily: bFont,
        color: eMuted, textAlign: "center",
      }),
      makeTextElement("@votrehandle", {
        x: padX, y: endY + Math.round(280 * scale), width: contentW, height: Math.round(80 * scale),
        fontSize: ctaSize, fontWeight: 700, fontFamily: hFont,
        color: eTxt, textAlign: "center",
      }),
    ],
  });

  return slides;
}

/**
 * Generate slides from text using a template's structure.
 */
export function generateFromTemplate(text: string, templateSlides: Slide[]): Slide[] {
  const paragraphs = text.split(/\n\s*\n|\n/).map(p => p.trim()).filter(p => p.length > 5);
  const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 3);
  const chunks = paragraphs.length >= 3 ? paragraphs : sentences;

  const result: Slide[] = [];

  for (let i = 0; i < templateSlides.length; i++) {
    const tpl = templateSlides[i];
    const newSlide: Slide = { ...JSON.parse(JSON.stringify(tpl)), id: crypto.randomUUID(), order: i };
    const textElements = newSlide.elements.filter(el => el.type === "text");

    if (tpl.type === "cover") {
      if (textElements[0] && chunks[0]) textElements[0].content = truncate(chunks[0], 8);
      if (textElements[1] && chunks[1]) textElements[1].content = truncate(chunks[1], 15);
    } else if (tpl.type === "end") {
      // Keep end slide as-is
    } else {
      const contentIdx = i - 1;
      const chunk = chunks[Math.min(contentIdx + 1, chunks.length - 1)] || "";
      const cs = chunk.split(/(?<=[.!?])\s+/).filter(s => s.length > 3);
      const sortedBySize = [...textElements].sort((a, b) => (b.style.fontSize || 0) - (a.style.fontSize || 0));
      if (sortedBySize[0] && cs[0]) sortedBySize[0].content = truncate(cs[0], 6);
      for (let j = 1; j < sortedBySize.length; j++) {
        if (sortedBySize[j]) {
          sortedBySize[j].content = cs.length > 1
            ? truncate(cs.slice(1).join(" "), 30)
            : truncate(chunk, 30);
        }
      }
    }

    result.push(newSlide);
  }

  return result;
}
