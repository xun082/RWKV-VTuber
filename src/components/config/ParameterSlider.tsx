import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface ParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  color: "green" | "blue" | "purple";
  leftLabel: string;
  rightLabel: string;
  formatValue: (value: number) => string;
  onChange: (value: number) => void;
}

export function ParameterSlider({
  label,
  value,
  min,
  max,
  step,
  color,
  leftLabel,
  rightLabel,
  formatValue,
  onChange,
}: ParameterSliderProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{label}</Label>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        color={color}
        variant="gradient"
        showLabels
        leftLabel={leftLabel}
        rightLabel={rightLabel}
        currentValue={formatValue(value)}
        onValueChange={(v) => onChange(v[0])}
        onValueCommit={(v) => onChange(v[0])}
      />
    </div>
  );
}
