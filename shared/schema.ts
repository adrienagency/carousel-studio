import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ─────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Brand Kits ────────────────────────────────────────────────────
export const brandKits = sqliteTable("brand_kits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  primaryColor: text("primary_color").notNull().default("#6366F1"),
  secondaryColor: text("secondary_color").notNull().default("#EC4899"),
  accentColor: text("accent_color").notNull().default("#F59E0B"),
  backgroundColor: text("background_color").notNull().default("#FFFFFF"),
  headingFont: text("heading_font").notNull().default("Inter"),
  bodyFont: text("body_font").notNull().default("Inter"),
  logoUrl: text("logo_url"),
  customFonts: text("custom_fonts").default("[]"), // JSON string
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
});

export const insertBrandKitSchema = createInsertSchema(brandKits).omit({ id: true });
export type InsertBrandKit = z.infer<typeof insertBrandKitSchema>;
export type BrandKit = typeof brandKits.$inferSelect;

// ─── Carousels ─────────────────────────────────────────────────────
export const carousels = sqliteTable("carousels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  title: text("title").notNull().default("Sans titre"),
  brandKitId: integer("brand_kit_id"),
  slides: text("slides").notNull().default("[]"), // JSON string
  settings: text("settings").default("{}"), // JSON string
  isTemplate: integer("is_template", { mode: "boolean" }).default(false),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const insertCarouselSchema = createInsertSchema(carousels).omit({ id: true });
export type InsertCarousel = z.infer<typeof insertCarouselSchema>;
export type Carousel = typeof carousels.$inferSelect;

// ─── Templates ─────────────────────────────────────────────────────
export const templates = sqliteTable("templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  carouselId: integer("carousel_id").notNull(),
  name: text("name").notNull(),
  category: text("category").default("general"),
  previewUrl: text("preview_url"),
});

export const insertTemplateSchema = createInsertSchema(templates).omit({ id: true });
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;
