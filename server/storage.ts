import {
  type User, type InsertUser, users,
  type BrandKit, type InsertBrandKit, brandKits,
  type Carousel, type InsertCarousel, carousels,
  type Template, type InsertTemplate, templates,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, desc } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Brand Kits
  getBrandKits(userId: number): Promise<BrandKit[]>;
  getBrandKit(id: number): Promise<BrandKit | undefined>;
  createBrandKit(kit: InsertBrandKit): Promise<BrandKit>;
  updateBrandKit(id: number, kit: Partial<InsertBrandKit>): Promise<BrandKit | undefined>;
  deleteBrandKit(id: number): Promise<void>;

  // Carousels
  getCarousels(userId: number): Promise<Carousel[]>;
  getCarousel(id: number): Promise<Carousel | undefined>;
  createCarousel(carousel: InsertCarousel): Promise<Carousel>;
  updateCarousel(id: number, carousel: Partial<InsertCarousel>): Promise<Carousel | undefined>;
  deleteCarousel(id: number): Promise<void>;

  // Templates
  getTemplates(userId: number): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  deleteTemplate(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.id, id)).get();
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.username, username)).get();
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    return db.insert(users).values(insertUser).returning().get();
  }

  // Brand Kits
  async getBrandKits(userId: number): Promise<BrandKit[]> {
    return db.select().from(brandKits).where(eq(brandKits.userId, userId)).all();
  }
  async getBrandKit(id: number): Promise<BrandKit | undefined> {
    return db.select().from(brandKits).where(eq(brandKits.id, id)).get();
  }
  async createBrandKit(kit: InsertBrandKit): Promise<BrandKit> {
    return db.insert(brandKits).values(kit).returning().get();
  }
  async updateBrandKit(id: number, kit: Partial<InsertBrandKit>): Promise<BrandKit | undefined> {
    return db.update(brandKits).set(kit).where(eq(brandKits.id, id)).returning().get();
  }
  async deleteBrandKit(id: number): Promise<void> {
    db.delete(brandKits).where(eq(brandKits.id, id)).run();
  }

  // Carousels
  async getCarousels(userId: number): Promise<Carousel[]> {
    return db.select().from(carousels)
      .where(and(eq(carousels.userId, userId), eq(carousels.isTemplate, false)))
      .orderBy(desc(carousels.updatedAt))
      .all();
  }
  async getCarousel(id: number): Promise<Carousel | undefined> {
    return db.select().from(carousels).where(eq(carousels.id, id)).get();
  }
  async createCarousel(carousel: InsertCarousel): Promise<Carousel> {
    const now = new Date().toISOString();
    return db.insert(carousels).values({
      ...carousel,
      createdAt: now,
      updatedAt: now,
    }).returning().get();
  }
  async updateCarousel(id: number, carousel: Partial<InsertCarousel>): Promise<Carousel | undefined> {
    return db.update(carousels).set({
      ...carousel,
      updatedAt: new Date().toISOString(),
    }).where(eq(carousels.id, id)).returning().get();
  }
  async deleteCarousel(id: number): Promise<void> {
    db.delete(carousels).where(eq(carousels.id, id)).run();
  }

  // Templates
  async getTemplates(userId: number): Promise<Template[]> {
    return db.select().from(templates).where(eq(templates.userId, userId)).all();
  }
  async createTemplate(template: InsertTemplate): Promise<Template> {
    return db.insert(templates).values(template).returning().get();
  }
  async deleteTemplate(id: number): Promise<void> {
    db.delete(templates).where(eq(templates.id, id)).run();
  }
}

export const storage = new DatabaseStorage();
