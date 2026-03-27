export interface FormatPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  ratio: string;
  platform: string;
}

export const FORMAT_PRESETS: FormatPreset[] = [
  { id: "ig-post", name: "Instagram Post", width: 1080, height: 1080, ratio: "1:1", platform: "instagram" },
  { id: "ig-story", name: "Instagram Story", width: 1080, height: 1920, ratio: "9:16", platform: "instagram" },
  { id: "li-post", name: "LinkedIn Post", width: 1200, height: 1200, ratio: "1:1", platform: "linkedin" },
  { id: "li-doc", name: "LinkedIn Document", width: 1080, height: 1350, ratio: "4:5", platform: "linkedin" },
  { id: "twitter", name: "Twitter / X", width: 1600, height: 900, ratio: "16:9", platform: "twitter" },
  { id: "presentation", name: "Presentation", width: 1920, height: 1080, ratio: "16:9", platform: "presentation" },
];

export function getPresetById(id: string): FormatPreset | undefined {
  return FORMAT_PRESETS.find((p) => p.id === id);
}

export function findMatchingPreset(width: number, height: number): FormatPreset | undefined {
  return FORMAT_PRESETS.find((p) => p.width === width && p.height === height);
}
