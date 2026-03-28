import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2 } from "lucide-react";
import type { GradientConfig, GradientStop } from "@/types/carousel";

interface GradientPickerProps {
  value?: GradientConfig;
  fallbackColor: string;
  onChange: (gradient: GradientConfig | undefined) => void;
}

function gradientToCSS(g: GradientConfig): string {
  const stops = g.stops.map(s => `${s.color} ${s.position}%`).join(", ");
  if (g.type === "radial") return `radial-gradient(circle, ${stops})`;
  return `linear-gradient(${g.angle ?? 180}deg, ${stops})`;
}

const PRESETS: GradientConfig[] = [
  { type: "linear", angle: 180, stops: [{ color: "#667eea", position: 0 }, { color: "#764ba2", position: 100 }] },
  { type: "linear", angle: 135, stops: [{ color: "#f093fb", position: 0 }, { color: "#f5576c", position: 100 }] },
  { type: "linear", angle: 180, stops: [{ color: "#4facfe", position: 0 }, { color: "#00f2fe", position: 100 }] },
  { type: "linear", angle: 180, stops: [{ color: "#43e97b", position: 0 }, { color: "#38f9d7", position: 100 }] },
  { type: "linear", angle: 180, stops: [{ color: "#fa709a", position: 0 }, { color: "#fee140", position: 100 }] },
  { type: "linear", angle: 180, stops: [{ color: "#a18cd1", position: 0 }, { color: "#fbc2eb", position: 100 }] },
  { type: "linear", angle: 180, stops: [{ color: "#ffecd2", position: 0 }, { color: "#fcb69f", position: 100 }] },
  { type: "linear", angle: 180, stops: [{ color: "#1a1a2e", position: 0 }, { color: "#16213e", position: 50 }, { color: "#0f3460", position: 100 }] },
];

export { gradientToCSS };

export function GradientPicker({ value, fallbackColor, onChange }: GradientPickerProps) {
  const [isActive, setIsActive] = useState(!!value);

  const handleToggle = () => {
    if (isActive) {
      onChange(undefined);
      setIsActive(false);
    } else {
      const defaultGrad: GradientConfig = {
        type: "linear",
        angle: 180,
        stops: [
          { color: fallbackColor, position: 0 },
          { color: "#6366F1", position: 100 },
        ],
      };
      onChange(defaultGrad);
      setIsActive(true);
    }
  };

  const updateStop = (idx: number, updates: Partial<GradientStop>) => {
    if (!value) return;
    const newStops = value.stops.map((s, i) => i === idx ? { ...s, ...updates } : s);
    onChange({ ...value, stops: newStops });
  };

  const addStop = () => {
    if (!value) return;
    const newStop: GradientStop = { color: "#888888", position: 50 };
    onChange({ ...value, stops: [...value.stops, newStop].sort((a, b) => a.position - b.position) });
  };

  const removeStop = (idx: number) => {
    if (!value || value.stops.length <= 2) return;
    onChange({ ...value, stops: value.stops.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Degrade</Label>
        <Button variant={isActive ? "secondary" : "ghost"} size="sm" className="h-6 text-[10px]" onClick={handleToggle}>
          {isActive ? "Actif" : "Desactive"}
        </Button>
      </div>

      {isActive && value && (
        <>
          {/* Preview */}
          <div
            className="w-full h-8 rounded-md border"
            style={{ background: gradientToCSS(value) }}
          />

          {/* Presets */}
          <div className="flex gap-1 flex-wrap">
            {PRESETS.map((preset, i) => (
              <button
                key={i}
                className="w-6 h-6 rounded-md border border-border hover:scale-110 transition-transform"
                style={{ background: gradientToCSS(preset) }}
                onClick={() => onChange(preset)}
                title={`Preset ${i + 1}`}
              />
            ))}
          </div>

          {/* Type + Angle */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Type</Label>
              <Select value={value.type} onValueChange={(v: any) => onChange({ ...value, type: v })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Lineaire</SelectItem>
                  <SelectItem value="radial">Radial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {value.type === "linear" && (
              <div>
                <Label className="text-[10px] text-muted-foreground">Angle ({value.angle ?? 180}°)</Label>
                <Slider
                  value={[value.angle ?? 180]}
                  onValueChange={([v]) => onChange({ ...value, angle: v })}
                  min={0} max={360} step={5}
                  className="mt-2"
                />
              </div>
            )}
          </div>

          {/* Stops */}
          <div className="space-y-1.5">
            {value.stops.map((stop, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  type="color"
                  value={stop.color}
                  onChange={(e) => updateStop(i, { color: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                />
                <Input
                  value={stop.color}
                  onChange={(e) => updateStop(i, { color: e.target.value })}
                  className="h-6 text-[10px] font-mono flex-1"
                  maxLength={7}
                />
                <Input
                  type="number"
                  value={stop.position}
                  onChange={(e) => updateStop(i, { position: Number(e.target.value) })}
                  className="h-6 text-[10px] w-12"
                  min={0} max={100}
                />
                {value.stops.length > 2 && (
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeStop(i)}>
                    <Trash2 className="w-2.5 h-2.5" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full h-6 text-[10px]" onClick={addStop}>
              <Plus className="w-3 h-3 mr-1" /> Ajouter un stop
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
