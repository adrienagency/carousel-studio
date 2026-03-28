import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBrandKitSchema, insertCarouselSchema, insertTemplateSchema } from "@shared/schema";
import session from "express-session";
import MemoryStore from "memorystore";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

const SessionStore = MemoryStore(session);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ─── Session + Passport ───────────────────────────────────────
  app.use(
    session({
      secret: "carousel-studio-secret-key-2024",
      resave: false,
      saveUninitialized: false,
      store: new SessionStore({ checkPeriod: 86400000 }),
      cookie: { maxAge: 86400000 * 7 }, // 7 days
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || user.password !== password) {
          return done(null, false, { message: "Invalid credentials" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });

  // Auth middleware
  function requireAuth(req: any, res: any, next: any) {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: "Not authenticated" });
  }

  // ─── Auth Routes ──────────────────────────────────────────────
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ error: "Username already exists" });
      }
      const user = await storage.createUser({ username, password });
      req.login(user, (err: any) => {
        if (err) return res.status(500).json({ error: "Login failed" });
        res.json({ id: user.id, username: user.username, displayName: user.displayName });
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: info?.message || "Invalid credentials" });
      req.login(user, (err: any) => {
        if (err) return next(err);
        res.json({ id: user.id, username: user.username, displayName: user.displayName });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err: any) => {
      if (err) return res.status(500).json({ error: "Logout failed" });
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      const u = req.user as any;
      return res.json({ id: u.id, username: u.username, displayName: u.displayName });
    }
    res.status(401).json({ error: "Not authenticated" });
  });

  // ─── Brand Kits ───────────────────────────────────────────────
  app.get("/api/brand-kits", requireAuth, async (req, res) => {
    const userId = (req.user as any).id;
    const kits = await storage.getBrandKits(userId);
    res.json(kits);
  });

  app.get("/api/brand-kits/:id", requireAuth, async (req, res) => {
    const kit = await storage.getBrandKit(Number(req.params.id));
    if (!kit) return res.status(404).json({ error: "Not found" });
    res.json(kit);
  });

  app.post("/api/brand-kits", requireAuth, async (req, res) => {
    const userId = (req.user as any).id;
    const data = { ...req.body, userId };
    const kit = await storage.createBrandKit(data);
    res.json(kit);
  });

  app.patch("/api/brand-kits/:id", requireAuth, async (req, res) => {
    const kit = await storage.updateBrandKit(Number(req.params.id), req.body);
    if (!kit) return res.status(404).json({ error: "Not found" });
    res.json(kit);
  });

  app.delete("/api/brand-kits/:id", requireAuth, async (req, res) => {
    await storage.deleteBrandKit(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── Carousels ────────────────────────────────────────────────
  app.get("/api/carousels", requireAuth, async (req, res) => {
    const userId = (req.user as any).id;
    const list = await storage.getCarousels(userId);
    res.json(list);
  });

  app.get("/api/carousels/:id", requireAuth, async (req, res) => {
    const carousel = await storage.getCarousel(Number(req.params.id));
    if (!carousel) return res.status(404).json({ error: "Not found" });
    res.json(carousel);
  });

  app.post("/api/carousels", requireAuth, async (req, res) => {
    const userId = (req.user as any).id;
    const data = { ...req.body, userId };
    const carousel = await storage.createCarousel(data);
    res.json(carousel);
  });

  app.patch("/api/carousels/:id", requireAuth, async (req, res) => {
    const carousel = await storage.updateCarousel(Number(req.params.id), req.body);
    if (!carousel) return res.status(404).json({ error: "Not found" });
    res.json(carousel);
  });

  app.delete("/api/carousels/:id", requireAuth, async (req, res) => {
    await storage.deleteCarousel(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── LLM Generate Slides (with model choice + brand kit colors) ──
  app.post("/api/generate-slides", async (req, res) => {
    try {
      const { text, brandKit, platform, model, width, height } = req.body;
      if (!text) return res.status(400).json({ error: "Text required" });

      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic();

      const w = width || 1080;
      const h = height || 1350;
      const scale = w / 1080;

      const systemPrompt = `Tu es un expert en creation de carrousels pour reseaux sociaux (LinkedIn, Instagram).
Analyse le texte fourni et cree un carrousel percutant.

Regles :
- Slide 1 (cover) : Titre accrocheur de max 8 mots + sous-titre de max 15 mots
- Slides intermediaires (content) : 1 idee forte par slide. Titre de max 6 mots + description de max 30 mots. Selectionne les points les plus interessants.
- Derniere slide (end) : Call-to-action engageant + mention @handle
- Nombre total de slides : entre 5 et 10 selon la richesse du contenu
- Chaque slide doit pouvoir se lire independamment
- Utilise un langage direct et impactant
- ANALYSE EN PROFONDEUR le texte, ne te contente pas de copier les premieres phrases
- Reformule, synthetise, rend le contenu plus percutant

Retourne UNIQUEMENT un JSON valide (pas de markdown, pas de commentaires). Format :
[
  {
    "type": "cover",
    "elements": [
      { "type": "text", "content": "...", "role": "title" },
      { "type": "text", "content": "...", "role": "subtitle" }
    ]
  },
  {
    "type": "content",
    "elements": [
      { "type": "text", "content": "...", "role": "title" },
      { "type": "text", "content": "...", "role": "body" }
    ]
  },
  {
    "type": "end",
    "elements": [
      { "type": "text", "content": "...", "role": "cta" },
      { "type": "text", "content": "@handle", "role": "subtitle" }
    ]
  }
]`;

      const chosenModel = model || "claude_sonnet_4_6";
      
      const message = await client.messages.create({
        model: chosenModel,
        max_tokens: 4000,
        messages: [
          { role: "user", content: `Cree un carrousel a partir de ce texte. Analyse en profondeur et reformule de maniere percutante :\n\n${text}` },
        ],
        system: systemPrompt,
      });

      const content = message.content[0];
      const responseText = content.type === "text" ? content.text : "";
      
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return res.status(500).json({ error: "Failed to parse LLM response" });
      }

      const rawSlides = JSON.parse(jsonMatch[0]);
      
      // Brand kit colors with contrast-safe text colors
      const colors = {
        primary: brandKit?.primaryColor || "#1A1A2E",
        secondary: brandKit?.secondaryColor || "#6366F1",
        accent: brandKit?.accentColor || "#F59E0B",
        bg: brandKit?.backgroundColor || "#FFFFFF",
        headingFont: brandKit?.headingFont || "Inter",
        bodyFont: brandKit?.bodyFont || "Inter",
      };

      // Color palette for slides — alternate between brand colors
      const bgPalette = [
        colors.bg,           // cover: light bg
        colors.primary,      // content 1: dark bg
        colors.bg,           // content 2: light bg  
        colors.secondary,    // content 3: colored bg
        colors.bg,           // content 4: light bg
        colors.accent,       // content 5: accent bg
        colors.bg,           // content 6: light bg
        colors.primary,      // content 7: dark bg
        colors.primary,      // end: dark bg
      ];

      // Determine text color based on background luminance for contrast
      function getContrastColor(bgHex: string): string {
        const hex = bgHex.replace("#", "");
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? "#1A1A2E" : "#FFFFFF";
      }

      // Font sizes increased by 30% (B1)
      const titleSize = Math.round(72 * scale);
      const subtitleSize = Math.round(36 * scale);
      const bodySize = Math.round(32 * scale);
      const ctaSize = Math.round(48 * scale);

      const slides = rawSlides.map((raw: any, index: number) => {
        const slideBg = bgPalette[index % bgPalette.length] || colors.bg;
        const textColor = getContrastColor(slideBg);
        const mutedColor = textColor === "#FFFFFF" ? "#FFFFFFAA" : "#1A1A2E99";

        return {
          id: crypto.randomUUID(),
          order: index,
          type: raw.type,
          backgroundColor: slideBg,
          elements: (raw.elements || []).map((el: any, elIdx: number) => ({
            id: crypto.randomUUID(),
            type: "text",
            x: Math.round(80 * scale),
            y: el.role === "title"
              ? Math.round(raw.type === "cover" ? h * 0.35 : h * 0.12)
              : el.role === "subtitle"
              ? Math.round(raw.type === "cover" ? h * 0.55 : h * 0.85)
              : Math.round(h * 0.35 + elIdx * Math.round(140 * scale)),
            width: Math.round(w - 160 * scale),
            height: el.role === "title" ? Math.round(200 * scale) : el.role === "body" ? Math.round(280 * scale) : Math.round(100 * scale),
            rotation: 0,
            content: el.content,
            locked: false,
            visible: true,
            zIndex: elIdx,
            style: {
              fontSize: el.role === "title" ? titleSize : el.role === "subtitle" ? subtitleSize : el.role === "cta" ? ctaSize : bodySize,
              fontFamily: el.role === "title" || el.role === "cta" ? colors.headingFont : colors.bodyFont,
              fontWeight: el.role === "title" || el.role === "cta" ? 800 : el.role === "subtitle" ? 400 : 400,
              color: el.role === "subtitle" ? mutedColor : textColor,
              textAlign: raw.type === "cover" || raw.type === "end" ? "center" : "left",
              lineHeight: el.role === "title" ? 1.15 : 1.5,
              letterSpacing: el.role === "title" ? -0.02 : 0,
            },
          })),
        };
      });

      res.json({ slides, model: chosenModel });
    } catch (err: any) {
      console.error("LLM generation error:", err);
      res.status(500).json({ error: err.message || "Generation failed" });
    }
  });

  // ─── Translate text ─────────────────────────────────────────
  app.post("/api/translate", async (req, res) => {
    try {
      const { slides, targetLang } = req.body;
      if (!slides) return res.status(400).json({ error: "Slides required" });

      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic();

      // Extract all text content from slides
      const texts: { slideIdx: number; elIdx: number; content: string }[] = [];
      slides.forEach((slide: any, si: number) => {
        (slide.elements || []).forEach((el: any, ei: number) => {
          if (el.type === "text" && el.content) {
            texts.push({ slideIdx: si, elIdx: ei, content: el.content });
          }
        });
      });

      const allTexts = texts.map((t) => t.content).join("\n---SEPARATOR---\n");

      const message = await client.messages.create({
        model: "claude_haiku_4_5",
        max_tokens: 4000,
        messages: [
          { role: "user", content: `Translate the following texts to ${targetLang || "American English"}. Keep the same tone and style. Return ONLY the translated texts separated by ---SEPARATOR--- (same order, same count). Do not add anything else.\n\n${allTexts}` },
        ],
      });

      const responseText = message.content[0].type === "text" ? message.content[0].text : "";
      const translated = responseText.split(/---SEPARATOR---/).map((s: string) => s.trim());

      // Map back to slides
      const result = JSON.parse(JSON.stringify(slides));
      texts.forEach((t, i) => {
        if (translated[i]) {
          result[t.slideIdx].elements[t.elIdx].content = translated[i];
        }
      });

      res.json({ slides: result });
    } catch (err: any) {
      console.error("Translation error:", err);
      res.status(500).json({ error: err.message || "Translation failed" });
    }
  });

  // ─── Export (Satori + resvg server-side rendering) ────────────
  app.post("/api/export", async (req, res) => {
    try {
      const { slides, settings, format, pixelRatio: pr } = req.body;
      if (!slides || !Array.isArray(slides) || slides.length === 0) {
        return res.status(400).json({ error: "No slides provided" });
      }

      const pixelRatio = Number(pr) || 2;
      const exportSettings = {
        width: settings?.width || 1080,
        height: settings?.height || 1080,
      };

      const { renderSlideToImage } = await import("./export-engine");

      if (format === "pdf") {
        // Render all slides to PNG, combine with jsPDF
        const { default: jsPDF } = await import("jspdf");
        const w = exportSettings.width;
        const h = exportSettings.height;
        const pdf = new jsPDF({
          orientation: w > h ? "landscape" : "portrait",
          unit: "px",
          format: [w, h],
        });

        for (let i = 0; i < slides.length; i++) {
          const pngBuf = await renderSlideToImage(slides[i], exportSettings, pixelRatio);
          const base64 = pngBuf.toString("base64");
          const imgData = `data:image/png;base64,${base64}`;
          if (i > 0) pdf.addPage([w, h]);
          pdf.addImage(imgData, "PNG", 0, 0, w, h);
        }

        const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));
        res.set({
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="carousel.pdf"',
          "Content-Length": pdfBuffer.length.toString(),
        });
        return res.send(pdfBuffer);
      }

      // PNG or JPEG — single file or zip
      if (slides.length === 1) {
        const pngBuf = await renderSlideToImage(slides[0], exportSettings, pixelRatio);
        const ext = format === "jpeg" ? "jpeg" : "png";
        res.set({
          "Content-Type": `image/${ext}`,
          "Content-Disposition": `attachment; filename="slide.${ext}"`,
          "Content-Length": pngBuf.length.toString(),
        });
        return res.send(pngBuf);
      }

      // Multiple slides → zip
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (let i = 0; i < slides.length; i++) {
        const pngBuf = await renderSlideToImage(slides[i], exportSettings, pixelRatio);
        const ext = format === "jpeg" ? "jpeg" : "png";
        zip.file(`slide-${String(i + 1).padStart(2, "0")}.${ext}`, pngBuf);
      }

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
      res.set({
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="carousel.zip"',
        "Content-Length": zipBuffer.length.toString(),
      });
      return res.send(zipBuffer);
    } catch (err: any) {
      console.error("Export error:", err);
      res.status(500).json({ error: err.message || "Export failed" });
    }
  });

  // ─── Templates ────────────────────────────────────────────────
  app.get("/api/templates", requireAuth, async (req, res) => {
    const userId = (req.user as any).id;
    const list = await storage.getTemplates(userId);
    res.json(list);
  });

  app.post("/api/templates", requireAuth, async (req, res) => {
    const userId = (req.user as any).id;
    const data = { ...req.body, userId };
    const template = await storage.createTemplate(data);
    res.json(template);
  });

  app.delete("/api/templates/:id", requireAuth, async (req, res) => {
    await storage.deleteTemplate(Number(req.params.id));
    res.json({ ok: true });
  });

  return httpServer;
}
