import type { Slide, SlideElement } from "@/types/carousel";

/**
 * Client-side fallback slide generator.
 * Used when the LLM API is unavailable.
 * Splits the input text into logical chunks and creates slides.
 */

interface GeneratorOptions {
  width: number;
  height: number;
  primaryColor?: string;
  backgroundColor?: string;
  headingFont?: string;
  bodyFont?: string;
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 5);
}

function truncate(str: string, maxWords: number): string {
  const words = str.split(/\s+/);
  if (words.length <= maxWords) return str;
  return words.slice(0, maxWords).join(" ") + "...";
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
    style: {
      fontSize: opts.fontSize,
      fontFamily: opts.fontFamily,
      fontWeight: opts.fontWeight,
      color: opts.color,
      textAlign: opts.textAlign,
      lineHeight: opts.lineHeight ?? 1.3,
      letterSpacing: opts.letterSpacing ?? 0,
    },
  };
}

export function generateSlidesFallback(
  text: string,
  options: GeneratorOptions
): Slide[] {
  const { width, height } = options;
  const bg = options.backgroundColor || "#FFFFFF";
  const color = options.primaryColor || "#1A1A2E";
  const hFont = options.headingFont || "Inter";
  const bFont = options.bodyFont || "Inter";
  const padX = Math.round(width * 0.074); // ~80px at 1080
  const contentW = width - padX * 2;

  // Scale font sizes relative to 1080 width
  const scale = width / 1080;
  const titleSize = Math.round(56 * scale);
  const subtitleSize = Math.round(28 * scale);
  const bodySize = Math.round(24 * scale);
  const ctaSize = Math.round(36 * scale);

  const paragraphs = splitIntoParagraphs(text);
  const sentences = splitIntoSentences(text);

  // Use paragraphs if enough, otherwise sentences
  const chunks = paragraphs.length >= 3 ? paragraphs : sentences;

  // Determine content for each role
  const coverTitle = truncate(chunks[0] || "Mon Carrousel", 8);
  const coverSubtitle = chunks.length > 1
    ? truncate(chunks[1], 15)
    : "Decouvrez les points cles";

  // Content slides: take the most interesting chunks (skip first 2 used for cover)
  const contentChunks = chunks.slice(2);
  const maxContent = Math.min(contentChunks.length, 7);
  const contentSlides: { title: string; body: string }[] = [];

  for (let i = 0; i < maxContent; i++) {
    const chunk = contentChunks[i];
    const chunkSentences = splitIntoSentences(chunk);
    const title = truncate(chunkSentences[0] || chunk, 6);
    const body = chunkSentences.length > 1
      ? truncate(chunkSentences.slice(1).join(" "), 30)
      : truncate(chunk, 30);
    contentSlides.push({ title, body });
  }

  // Ensure at least 3 content slides for a total of 5
  while (contentSlides.length < 3) {
    contentSlides.push({
      title: `Point cle ${contentSlides.length + 1}`,
      body: truncate(text, 30),
    });
  }

  const slides: Slide[] = [];

  // ─── COVER SLIDE ────────────────────────────────────
  const coverCenterY = Math.round(height * 0.35);
  slides.push({
    id: crypto.randomUUID(),
    order: 0,
    type: "cover",
    backgroundColor: bg,
    elements: [
      makeTextElement(coverTitle, {
        x: padX, y: coverCenterY, width: contentW, height: Math.round(180 * scale),
        fontSize: titleSize, fontWeight: 800, fontFamily: hFont,
        color, textAlign: "center", lineHeight: 1.15, letterSpacing: -0.02,
      }),
      makeTextElement(coverSubtitle, {
        x: padX, y: coverCenterY + Math.round(200 * scale), width: contentW, height: Math.round(80 * scale),
        fontSize: subtitleSize, fontWeight: 400, fontFamily: bFont,
        color: color + "99", textAlign: "center",
      }),
    ],
  });

  // ─── CONTENT SLIDES ─────────────────────────────────
  contentSlides.forEach((cs, i) => {
    const slideNum = Math.round(height * 0.06);
    slides.push({
      id: crypto.randomUUID(),
      order: i + 1,
      type: "content",
      backgroundColor: bg,
      elements: [
        // Slide number
        makeTextElement(`${String(i + 1).padStart(2, "0")}`, {
          x: padX, y: Math.round(height * 0.07), width: Math.round(100 * scale), height: Math.round(60 * scale),
          fontSize: Math.round(48 * scale), fontWeight: 800, fontFamily: hFont,
          color: color + "22", textAlign: "left",
        }),
        // Title
        makeTextElement(cs.title, {
          x: padX, y: Math.round(height * 0.18), width: contentW, height: Math.round(120 * scale),
          fontSize: Math.round(40 * scale), fontWeight: 700, fontFamily: hFont,
          color, textAlign: "left", lineHeight: 1.2, letterSpacing: -0.01,
        }),
        // Separator line
        {
          id: crypto.randomUUID(),
          type: "shape" as const,
          x: padX,
          y: Math.round(height * 0.34),
          width: Math.round(60 * scale),
          height: Math.round(4 * scale),
          rotation: 0,
          locked: false,
          visible: true,
          style: { backgroundColor: color, borderRadius: 2, opacity: 0.3 },
        },
        // Body
        makeTextElement(cs.body, {
          x: padX, y: Math.round(height * 0.40), width: contentW, height: Math.round(240 * scale),
          fontSize: bodySize, fontWeight: 400, fontFamily: bFont,
          color: color + "CC", textAlign: "left", lineHeight: 1.6,
        }),
      ],
    });
  });

  // ─── END SLIDE ──────────────────────────────────────
  const endY = Math.round(height * 0.35);
  slides.push({
    id: crypto.randomUUID(),
    order: slides.length,
    type: "end",
    backgroundColor: bg,
    elements: [
      makeTextElement("Merci !", {
        x: padX, y: endY, width: contentW, height: Math.round(120 * scale),
        fontSize: titleSize, fontWeight: 800, fontFamily: hFont,
        color, textAlign: "center", lineHeight: 1.2,
      }),
      makeTextElement("Suivez-moi pour plus de contenu", {
        x: padX, y: endY + Math.round(140 * scale), width: contentW, height: Math.round(60 * scale),
        fontSize: subtitleSize, fontWeight: 400, fontFamily: bFont,
        color: color + "88", textAlign: "center",
      }),
      makeTextElement("@votrehandle", {
        x: padX, y: endY + Math.round(220 * scale), width: contentW, height: Math.round(60 * scale),
        fontSize: ctaSize, fontWeight: 700, fontFamily: hFont,
        color, textAlign: "center",
      }),
    ],
  });

  return slides;
}

/**
 * Generate slides from text using a template's structure.
 * Preserves the template's visual layout (colors, fonts, positions)
 * but replaces the text content with parsed chunks from the input.
 */
export function generateFromTemplate(
  text: string,
  templateSlides: Slide[],
): Slide[] {
  const paragraphs = text.split(/\n\s*\n|\n/).map(p => p.trim()).filter(p => p.length > 5);
  const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 3);
  const chunks = paragraphs.length >= 3 ? paragraphs : sentences;

  // Map chunks to template slide structure
  const result: Slide[] = [];

  for (let i = 0; i < templateSlides.length; i++) {
    const tpl = templateSlides[i];
    const newSlide: Slide = {
      ...JSON.parse(JSON.stringify(tpl)),
      id: crypto.randomUUID(),
      order: i,
    };

    // Replace text content in elements using available chunks
    const textElements = newSlide.elements.filter(el => el.type === "text");
    
    if (tpl.type === "cover") {
      // Cover: use first chunk as title, second as subtitle
      if (textElements[0] && chunks[0]) {
        const words = chunks[0].split(/\s+/);
        textElements[0].content = words.slice(0, 8).join(" ");
      }
      if (textElements[1] && chunks[1]) {
        const words = chunks[1].split(/\s+/);
        textElements[1].content = words.slice(0, 15).join(" ");
      }
    } else if (tpl.type === "end") {
      // End slide: keep CTA as-is or use last chunk
      // Don't modify end slides much
    } else {
      // Content slides: map remaining chunks
      const contentIdx = i - 1; // Skip cover
      const chunk = chunks[Math.min(contentIdx + 1, chunks.length - 1)] || "";
      const chunkSentences = chunk.split(/(?<=[.!?])\s+/).filter(s => s.length > 3);
      
      // First text element = title
      // Find the largest font-size element as title
      const sortedBySize = [...textElements].sort(
        (a, b) => (b.style.fontSize || 0) - (a.style.fontSize || 0)
      );
      
      if (sortedBySize[0] && chunkSentences[0]) {
        const words = chunkSentences[0].split(/\s+/);
        sortedBySize[0].content = words.slice(0, 6).join(" ");
      }
      // Remaining text elements = body
      for (let j = 1; j < sortedBySize.length; j++) {
        if (sortedBySize[j] && chunkSentences.length > 1) {
          sortedBySize[j].content = chunkSentences.slice(1).join(" ").split(/\s+/).slice(0, 30).join(" ");
        } else if (sortedBySize[j] && chunk) {
          sortedBySize[j].content = chunk.split(/\s+/).slice(0, 30).join(" ");
        }
      }
    }

    result.push(newSlide);
  }

  return result;
}
