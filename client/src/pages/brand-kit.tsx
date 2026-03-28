import { useState, useMemo } from "react";
import { guestStorage } from "@/lib/guest-storage";
import type { GuestBrandKit, BrandKitImage } from "@/types/carousel";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Trash2, Palette, Upload, X } from "lucide-react";

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-9 h-9 rounded-md cursor-pointer border-0 p-0" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 font-mono text-xs uppercase" maxLength={7} />
      </div>
    </div>
  );
}

function BrandKitCard({ kit, onSave, onDelete, onImagesChange }: { kit: GuestBrandKit; onSave: (id: string, data: Partial<GuestBrandKit>) => void; onDelete: (id: string) => void; onImagesChange: () => void }) {
  const [name, setName] = useState(kit.name);
  const [primaryColor, setPrimaryColor] = useState(kit.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(kit.secondaryColor);
  const [accentColor, setAccentColor] = useState(kit.accentColor);
  const [backgroundColor, setBackgroundColor] = useState(kit.backgroundColor);
  const [headingFont, setHeadingFont] = useState(kit.headingFont);
  const [bodyFont, setBodyFont] = useState(kit.bodyFont);
  const [images, setImages] = useState<BrandKitImage[]>(() => guestStorage.getBrandKitImages(kit.id));

  const save = () => onSave(kit.id, { name, primaryColor, secondaryColor, accentColor, backgroundColor, headingFont, bodyFont });

  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const newImg = guestStorage.addBrandKitImage(kit.id, file.name, reader.result as string);
          if (newImg) {
            setImages(guestStorage.getBrandKitImages(kit.id));
            onImagesChange();
          }
        };
        reader.readAsDataURL(file);
      });
    };
    input.click();
  };

  const handleImageDelete = (imageId: string) => {
    guestStorage.removeBrandKitImage(kit.id, imageId);
    setImages(guestStorage.getBrandKitImages(kit.id));
    onImagesChange();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={save} className="h-8 font-semibold border-0 p-0 focus-visible:ring-0 text-base" />
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(kit.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3">Couleurs</p>
          <div className="grid grid-cols-2 gap-3">
            <ColorPicker label="Principale" value={primaryColor} onChange={updateAndSave(setPrimaryColor, "primaryColor")} />
            <ColorPicker label="Secondaire" value={secondaryColor} onChange={updateAndSave(setSecondaryColor, "secondaryColor")} />
            <ColorPicker label="Accent" value={accentColor} onChange={updateAndSave(setAccentColor, "accentColor")} />
            <ColorPicker label="Fond" value={backgroundColor} onChange={updateAndSave(setBackgroundColor, "backgroundColor")} />
          </div>
        </div>
        <div className="flex gap-1.5 h-6 rounded-md overflow-hidden">
          <div className="flex-1" style={{ backgroundColor: primaryColor }} />
          <div className="flex-1" style={{ backgroundColor: secondaryColor }} />
          <div className="flex-1" style={{ backgroundColor: accentColor }} />
          <div className="flex-1 border" style={{ backgroundColor }} />
        </div>
        <Separator />
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3">Typographie</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Font titre</Label>
              <Input value={headingFont} onChange={(e) => setHeadingFont(e.target.value)} onBlur={save} className="h-9" />
              <p className="text-lg mt-1" style={{ fontFamily: headingFont }}>Apercu du titre</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Font corps</Label>
              <Input value={bodyFont} onChange={(e) => setBodyFont(e.target.value)} onBlur={save} className="h-9" />
              <p className="text-sm mt-1" style={{ fontFamily: bodyFont }}>Apercu du texte de corps</p>
            </div>
          </div>
        </div>
        <Button size="sm" onClick={save} className="w-full">Sauvegarder</Button>
        <Separator />
        {/* Images section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground">Images ({images.length})</p>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleImageUpload}>
              <Upload className="w-3 h-3 mr-1" /> Ajouter
            </Button>
          </div>
          {images.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative group aspect-square rounded-md overflow-hidden border border-border">
                  <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                  <button
                    className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 rounded p-0.5"
                    title="Supprimer"
                    onClick={() => handleImageDelete(img.id)}
                  >
                    <X className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-3">Aucune image. Cliquez sur Ajouter pour uploader.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BrandKitPage() {
  const [, navigate] = useLocation();
  const [version, setVersion] = useState(0);
  const kits = useMemo(() => { void version; return guestStorage.getBrandKits(); }, [version]);

  const handleCreate = () => {
    guestStorage.saveBrandKit({
      name: "Nouvelle charte",
      primaryColor: "#6366F1", secondaryColor: "#EC4899",
      accentColor: "#F59E0B", backgroundColor: "#FFFFFF",
      headingFont: "Inter", bodyFont: "Inter",
    });
    setVersion((v) => v + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="font-semibold">Chartes graphiques</h1>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-1.5" /> Nouvelle charte
          </Button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        {kits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kits.map((kit) => (
              <BrandKitCard
                key={kit.id}
                kit={kit}
                onSave={(id, data) => { guestStorage.updateBrandKit(id, data); setVersion((v) => v + 1); }}
                onDelete={(id) => { guestStorage.deleteBrandKit(id); setVersion((v) => v + 1); }}
                onImagesChange={() => setVersion((v) => v + 1)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Palette className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-medium mb-1">Aucune charte graphique</h2>
            <p className="text-sm text-muted-foreground mb-4">Definissez vos couleurs et fonts</p>
            <Button onClick={handleCreate}><Plus className="w-4 h-4 mr-1.5" /> Creer une charte</Button>
          </div>
        )}
      </main>
    </div>
  );
}
