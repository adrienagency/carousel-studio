# Modal + Server Rewrite Spec

## NewCarouselModal (`/home/user/workspace/carousel-studio/client/src/components/new-carousel-modal.tsx`)

### New state variables to add:
```tsx
// Images
const [decoImages, setDecoImages] = useState<{ id: string; name: string; dataUrl: string }[]>([]);
const [infoImages, setInfoImages] = useState<{ id: string; name: string; dataUrl: string }[]>([]);

// Author options
const [showAuthor, setShowAuthor] = useState(false);
const [authorName, setAuthorName] = useState("");
const [authorRole, setAuthorRole] = useState("");
const [authorPhoto, setAuthorPhoto] = useState<string | null>(null); // dataUrl
const [authorFontSize, setAuthorFontSize] = useState(18);

// Topline
const [showTopline, setShowTopline] = useState(false);
const [toplineText, setToplineText] = useState("");
const [toplineFontSize, setToplineFontSize] = useState(14);
```

### New import handlers:
```tsx
const handleImageUpload = (type: "deco" | "info") => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = true;
  input.onchange = (ev) => {
    const files = Array.from((ev.target as HTMLInputElement).files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const item = { id: crypto.randomUUID(), name: file.name, dataUrl: reader.result as string };
        if (type === "deco") setDecoImages(prev => [...prev, item]);
        else setInfoImages(prev => [...prev, item]);
      };
      reader.readAsDataURL(file);
    });
  };
  input.click();
};

const handleAuthorPhotoUpload = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = (ev) => {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAuthorPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };
  input.click();
};
```

### UI additions (in order, after the CONTENU text area):

#### 1. Images section (between text and actions)
```
IMAGES (optional)
  Images de decoration (fonds, ambiance)
  [Upload zone with thumbnails grid, delete per image]
  
  Images informatives (contenu, graphiques)
  [Upload zone with thumbnails grid, delete per image]
```

#### 2. Author section (collapsible)
```
AUTEUR (optional toggle)
  [Switch to enable]
  When enabled:
    Photo | Nom Prenom | Fonction
    Taille typo: [slider 10-24px, default 18]
```

#### 3. Topline section (collapsible)
```
TEXTE FIXE EN HAUT (optional toggle)
  [Switch to enable]
  When enabled:
    Texte: [input]
    Taille typo: [slider 8-20px, default 14]
```

### Modified handleGenerate:
Send all new data to the API:
```tsx
body: JSON.stringify({
  text,
  brandKit: kit,
  platform: getPlatform(),
  model: selectedModel,
  width: w,
  height: h,
  // New fields:
  decoImages: decoImages.map(img => ({ id: img.id, name: img.name })),
  infoImages: infoImages.map(img => ({ id: img.id, name: img.name, dataUrl: img.dataUrl })),
  author: showAuthor ? { name: authorName, role: authorRole, photo: authorPhoto, fontSize: authorFontSize } : null,
  topline: showTopline ? { text: toplineText, fontSize: toplineFontSize } : null,
}),
```

After getting slides back from API (or local gen), inject:
- Author element on cover (first) and end (last) slides
- Topline element on ALL slides
- Deco images as background images on appropriate slides
- Info images as image elements on content slides

### Post-processing function (after slides are generated):
```tsx
function injectOverlays(slides: Slide[], opts: {
  author?: { name: string; role: string; photo: string | null; fontSize: number };
  topline?: { text: string; fontSize: number };
  decoImages?: { dataUrl: string }[];
  infoImages?: { dataUrl: string }[];
  width: number;
  height: number;
}): Slide[] {
  // Clone slides
  const result = slides.map(s => ({ ...s, elements: [...s.elements] }));
  
  // Inject topline on ALL slides (position: top-left, 24px from edges)
  if (opts.topline?.text) {
    result.forEach(slide => {
      slide.elements.push({
        id: crypto.randomUUID(), type: "text", x: 24, y: 24,
        width: opts.width - 48, height: 30, rotation: 0,
        locked: true, visible: true, zIndex: 100,
        style: {
          fontSize: opts.topline!.fontSize, fontWeight: 600,
          fontFamily: "Inter", color: /* use contrast color based on slide bg */,
          textAlign: "left", textTransform: "uppercase",
          letterSpacing: 0.1, lineHeight: 1.2,
        },
        content: opts.topline!.text.toUpperCase(),
      });
    });
  }

  // Inject author on cover + end slides (position: bottom-left, 24px from edges)
  if (opts.author?.name) {
    const coverIdx = 0;
    const endIdx = result.length - 1;
    [coverIdx, endIdx].forEach(idx => {
      // Author name + role text
      result[idx].elements.push({
        id: crypto.randomUUID(), type: "text",
        x: opts.author!.photo ? 68 : 24, y: opts.height - 24 - 40,
        width: 400, height: 40, rotation: 0,
        locked: true, visible: true, zIndex: 100,
        style: {
          fontSize: opts.author!.fontSize, fontWeight: 600,
          fontFamily: "Inter", color: /* contrast */,
          textAlign: "left", lineHeight: 1.3,
        },
        content: `${opts.author!.name}\n${opts.author!.role}`,
      });
      // Author photo (if provided)
      if (opts.author!.photo) {
        result[idx].elements.push({
          id: crypto.randomUUID(), type: "image",
          x: 24, y: opts.height - 24 - 40,
          width: 40, height: 40, rotation: 0,
          src: opts.author!.photo,
          locked: true, visible: true, zIndex: 100,
          style: { objectFit: "cover", borderRadius: 20, opacity: 1 },
        });
      }
    });
  }

  // Distribute deco images as slide backgrounds
  if (opts.decoImages?.length) {
    opts.decoImages.forEach((img, i) => {
      const slideIdx = Math.min(i, result.length - 1);
      result[slideIdx].backgroundImage = img.dataUrl;
      result[slideIdx].backgroundImageOpacity = 0.3;
    });
  }

  // Distribute info images into content slides
  if (opts.infoImages?.length) {
    const contentSlides = result.filter(s => s.type === "content");
    opts.infoImages.forEach((img, i) => {
      const target = contentSlides[i % contentSlides.length];
      if (target) {
        target.elements.push({
          id: crypto.randomUUID(), type: "image",
          x: Math.round(opts.width * 0.1), y: Math.round(opts.height * 0.55),
          width: Math.round(opts.width * 0.8), height: Math.round(opts.height * 0.35),
          rotation: 0, src: img.dataUrl,
          locked: false, visible: true, zIndex: 50,
          style: { objectFit: "contain", borderRadius: 12, opacity: 1 },
        });
      }
    });
  }

  return result;
}
```

## Server routes.ts — Updated prompt

The LLM prompt should be updated to handle info images:
- When infoImages are provided, tell the LLM to create slides that pair well with the image descriptions
- Add `"hasImage": true` to the JSON format for slides that should include an informative image
- The actual image insertion happens client-side in the post-processing

Updated system prompt addition:
```
Si des images informatives sont fournies, certaines slides "content" doivent inclure "hasImage": true.
Le texte de ces slides doit être plus court (max 15 mots pour le body) pour laisser de la place à l'image.
```
