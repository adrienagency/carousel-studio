import { useState, useMemo } from "react";
import { guestStorage, type GuestCarousel } from "@/lib/guest-storage";
import type { GuestTemplate } from "@/types/carousel";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, MoreVertical, Trash2, Copy, FileText, Palette, Layers, BookTemplate,
} from "lucide-react";
import { NewCarouselModal } from "@/components/new-carousel-modal";
import type { Slide } from "@/types/carousel";

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const [version, setVersion] = useState(0);
  const [showNewModal, setShowNewModal] = useState(false);

  const carousels = useMemo(() => { void version; return guestStorage.getCarousels(); }, [version]);
  const templates = useMemo(() => { void version; return guestStorage.getTemplates(); }, [version]);

  const handleCreateCarousel = (data: {
    title: string;
    slides: Slide[];
    settings: { width: number; height: number; platform: string };
  }) => {
    setShowNewModal(false);
    const gc = guestStorage.createCarousel({
      title: data.title,
      slides: JSON.stringify(data.slides),
      settings: JSON.stringify(data.settings),
    });
    setVersion((v) => v + 1);
    navigate(`/editor/${gc.id}`);
  };

  const handleDelete = (id: string) => {
    guestStorage.deleteCarousel(id);
    setVersion((v) => v + 1);
  };

  const handleDuplicate = (id: string) => {
    guestStorage.duplicateCarousel(id);
    setVersion((v) => v + 1);
  };

  const handleDeleteTemplate = (id: string) => {
    guestStorage.deleteTemplate(id);
    setVersion((v) => v + 1);
  };

  const handleUseTemplate = (tpl: GuestTemplate) => {
    const gc = guestStorage.createCarousel({
      title: tpl.name,
      slides: tpl.slides,
      settings: tpl.settings,
    });
    setVersion((v) => v + 1);
    navigate(`/editor/${gc.id}`);
  };

  const getSlideCount = (c: GuestCarousel) => {
    try { const s = JSON.parse(c.slides); return Array.isArray(s) ? s.length : 0; }
    catch { return 0; }
  };

  const getFirstSlideColor = (c: GuestCarousel) => {
    try { const s = JSON.parse(c.slides); return s[0]?.backgroundColor || "#6366F1"; }
    catch { return "#6366F1"; }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-label="Carousel Studio">
              <rect x="2" y="6" width="28" height="20" rx="4" stroke="hsl(239 84% 67%)" strokeWidth="2.5" fill="none" />
              <rect x="8" y="11" width="7" height="10" rx="1.5" fill="hsl(239 84% 67%)" opacity="0.3" />
              <rect x="12.5" y="9" width="7" height="14" rx="1.5" fill="hsl(239 84% 67%)" opacity="0.6" />
              <rect x="17" y="11" width="7" height="10" rx="1.5" fill="hsl(239 84% 67%)" />
            </svg>
            <span className="font-semibold tracking-tight">Carousel Studio</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/brand-kit")}>
              <Palette className="w-4 h-4 mr-1.5" />
              Chartes
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Carousel Studio</h1>
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nouveau carrousel
          </Button>
        </div>

        <Tabs defaultValue="carousels">
          <TabsList>
            <TabsTrigger value="carousels" className="gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Carrousels ({carousels.length})
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5">
              <BookTemplate className="w-3.5 h-3.5" />
              Templates ({templates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="carousels" className="mt-4">
            {carousels.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {carousels.map((carousel) => (
                  <Card
                    key={carousel.id}
                    className="group cursor-pointer overflow-hidden hover-elevate"
                    onClick={() => navigate(`/editor/${carousel.id}`)}
                  >
                    <div
                      className="aspect-square relative flex items-center justify-center"
                      style={{ backgroundColor: getFirstSlideColor(carousel) }}
                    >
                      <Layers className="w-10 h-10 text-white/30" />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button size="icon" variant="secondary" className="h-7 w-7">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(carousel.id); }}>
                              <Copy className="w-3.5 h-3.5 mr-2" /> Dupliquer
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(carousel.id); }}>
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium truncate">{carousel.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <FileText className="w-3 h-3" />
                        <span>{getSlideCount(carousel)} slides</span>
                        <span className="ml-auto">{new Date(carousel.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Layers className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <h2 className="text-lg font-medium mb-1">Aucun carrousel</h2>
                <p className="text-sm text-muted-foreground mb-4">Creez votre premier carrousel</p>
                <Button onClick={() => setShowNewModal(true)}>
                  <Plus className="w-4 h-4 mr-1.5" /> Nouveau carrousel
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            {templates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {templates.map((tpl) => (
                  <Card key={tpl.id} className="group cursor-pointer overflow-hidden hover-elevate" onClick={() => handleUseTemplate(tpl)}>
                    <div className="aspect-square relative flex items-center justify-center bg-primary/10">
                      <BookTemplate className="w-10 h-10 text-primary/30" />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="secondary" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium truncate">{tpl.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{tpl.category}</p>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <BookTemplate className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <h2 className="text-lg font-medium mb-1">Aucun template</h2>
                <p className="text-sm text-muted-foreground">Sauvegardez un carrousel comme template depuis l'editeur</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <NewCarouselModal open={showNewModal} onClose={() => setShowNewModal(false)} onCreate={handleCreateCarousel} />
    </div>
  );
}
