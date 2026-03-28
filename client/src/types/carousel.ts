export interface SlideElement {
  id: string;
  type: "text" | "image" | "shape" | "icon" | "divider";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content?: string;
  src?: string;
  locked: boolean;
  visible: boolean;
  zIndex: number;
  style: ElementStyle;
  layout?: ElementLayout;
}

export interface GradientStop {
  color: string;
  position: number; // 0-100
}

export interface GradientConfig {
  type: "linear" | "radial";
  angle?: number; // degrees, for linear
  stops: GradientStop[];
}

export interface ShadowConfig {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
}

export interface ElementStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  color?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
  letterSpacing?: number;
  hyphens?: boolean;
  textAutoHeight?: boolean;
  objectFit?: "cover" | "contain" | "fill";
  aspectRatio?: string;
  borderRadius?: number;
  opacity?: number;
  backgroundColor?: string;
  gradient?: GradientConfig;
  textDecoration?: string;
  fontStyle?: string;
  shadow?: ShadowConfig;
  filterBlur?: number; // px
}

export interface ElementLayout {
  direction?: "horizontal" | "vertical";
  alignItems?: "start" | "center" | "end" | "stretch";
  justifyContent?: "start" | "center" | "end" | "space-between" | "space-around";
  gap?: number;
  padding?: number;
  flexWrap?: boolean;
}

export type SlideType = "cover" | "content" | "end" | "blank";

export interface Slide {
  id: string;
  order: number;
  type: SlideType;
  backgroundColor: string;
  backgroundGradient?: GradientConfig;
  backgroundImage?: string;
  autoLayout?: boolean;
  layoutDirection?: "vertical" | "horizontal";
  layoutAlign?: "flex-start" | "center" | "flex-end" | "stretch";
  layoutGap?: number;
  layoutPadding?: number;
  elements: SlideElement[];
}

export interface CarouselSettings {
  width: number;
  height: number;
  platform: string;
}

export const DEFAULT_SETTINGS: CarouselSettings = {
  width: 1080,
  height: 1080,
  platform: "linkedin",
};

export interface GuestTemplate {
  id: string;
  name: string;
  category: string;
  slides: string;
  settings: string;
  createdAt: string;
}

export interface GuestBrandKit {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  headingFont: string;
  bodyFont: string;
}

export function createDefaultSlide(order: number, type: SlideType = "blank"): Slide {
  return {
    id: crypto.randomUUID(),
    order,
    type,
    backgroundColor: "#FFFFFF",
    elements: [],
  };
}

export function createTextElement(
  content: string,
  opts: Partial<SlideElement> = {}
): SlideElement {
  return {
    id: crypto.randomUUID(),
    type: "text",
    x: 80,
    y: 80,
    width: 920,
    height: 100,
    rotation: 0,
    content,
    locked: false,
    visible: true,
    zIndex: 0,
    style: {
      fontSize: 48,
      fontFamily: "Inter",
      fontWeight: 700,
      color: "#1A1A2E",
      textAlign: "left",
      lineHeight: 1.2,
      letterSpacing: -0.02,
    },
    ...opts,
  };
}

export function createImageElement(
  src: string,
  opts: Partial<SlideElement> = {}
): SlideElement {
  return {
    id: crypto.randomUUID(),
    type: "image",
    x: 80,
    y: 80,
    width: 400,
    height: 400,
    rotation: 0,
    src,
    locked: false,
    visible: true,
    zIndex: 0,
    style: {
      objectFit: "cover",
      borderRadius: 0,
      opacity: 1,
    },
    ...opts,
  };
}
