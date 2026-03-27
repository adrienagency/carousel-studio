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

  // ─── LLM Generate Slides (no auth required — guests can use) ──
  app.post("/api/generate-slides", async (req, res) => {
    try {
      const { text, brandKit, platform } = req.body;
      if (!text) return res.status(400).json({ error: "Text required" });

      // Use Anthropic SDK for slide generation
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic();

      const systemPrompt = `You are a carousel content strategist. Given text input, create a structured carousel for ${platform || "linkedin"}.

Return ONLY valid JSON array of slides. Each slide object:
{
  "type": "cover" | "content" | "end",
  "elements": [
    {
      "type": "text",
      "content": "...",
      "role": "title" | "subtitle" | "body" | "cta"
    }
  ]
}

Rules:
- Slide 1: type "cover" with compelling title + subtitle
- Slides 2-N: type "content", one key idea per slide, title + body (max 3 lines)
- Last slide: type "end" with CTA text
- Extract the most impactful points from the input
- Keep text punchy and scannable
- 5-8 slides total`;

      const message = await client.messages.create({
        model: "claude_sonnet_4_6",
        max_tokens: 2000,
        messages: [
          { role: "user", content: `Create a carousel from this text:\n\n${text}` },
        ],
        system: systemPrompt,
      });

      const content = message.content[0];
      const responseText = content.type === "text" ? content.text : "";
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return res.status(500).json({ error: "Failed to parse LLM response" });
      }

      const rawSlides = JSON.parse(jsonMatch[0]);
      
      // Transform to our Slide format with brand kit colors
      const bg = brandKit?.backgroundColor || "#FFFFFF";
      const primaryColor = brandKit?.primaryColor || "#1A1A2E";
      const headingFont = brandKit?.headingFont || "Inter";
      const bodyFont = brandKit?.bodyFont || "Inter";

      const slides = rawSlides.map((raw: any, index: number) => ({
        id: crypto.randomUUID(),
        order: index,
        type: raw.type,
        backgroundColor: bg,
        elements: (raw.elements || []).map((el: any, elIdx: number) => ({
          id: crypto.randomUUID(),
          type: "text",
          x: 80,
          y: el.role === "title" ? 80 + (raw.type === "cover" ? 300 : 60) : el.role === "subtitle" ? 420 : 200 + elIdx * 140,
          width: 920,
          height: el.role === "title" ? 160 : el.role === "body" ? 200 : 80,
          rotation: 0,
          content: el.content,
          locked: false,
          visible: true,
          style: {
            fontSize: el.role === "title" ? 56 : el.role === "subtitle" ? 28 : el.role === "cta" ? 32 : 24,
            fontFamily: el.role === "title" || el.role === "cta" ? headingFont : bodyFont,
            fontWeight: el.role === "title" || el.role === "cta" ? 800 : el.role === "subtitle" ? 500 : 400,
            color: primaryColor,
            textAlign: raw.type === "cover" || raw.type === "end" ? "center" : "left",
            lineHeight: 1.3,
            letterSpacing: el.role === "title" ? -0.02 : 0,
          },
        })),
      }));

      res.json({ slides });
    } catch (err: any) {
      console.error("LLM generation error:", err);
      res.status(500).json({ error: err.message || "Generation failed" });
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
