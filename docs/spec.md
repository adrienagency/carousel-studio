# Carousel Studio — Spec

## Stack
- Express + Vite + React + Tailwind + shadcn/ui (webapp template)
- Zustand for state (carousel-store.ts, auth-store.ts)
- Types in client/src/types/carousel.ts
- Auth: passport + express-session (already in routes.ts)
- Schema: shared/schema.ts (users, brandKits, carousels, templates)

## Routes (wouter hash)
- / → login
- /register → register
- /dashboard → main dashboard
- /brand-kit → brand kit management
- /editor/:id → carousel editor

## API Endpoints
- POST /api/auth/register, /api/auth/login, /api/auth/logout, GET /api/auth/me
- GET/POST /api/brand-kits, GET/PATCH/DELETE /api/brand-kits/:id
- GET/POST /api/carousels, GET/PATCH/DELETE /api/carousels/:id
- POST /api/generate-slides
- GET/POST /api/templates, DELETE /api/templates/:id

## Design
- Light theme: bg #F1F5F9, card white, indigo accent (hsl 239 84% 67%)
- Clean minimal design tool aesthetic
- Desktop only
- No emoji
- Inter font family

## Editor Layout
- Top toolbar (save, export, title)
- Left panel: slide thumbnails (sortable)
- Center: active slide WYSIWYG canvas
- Right panel: properties (element styles, colors, fonts)
