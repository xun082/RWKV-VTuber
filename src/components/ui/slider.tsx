import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

export interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  showLabels?: boolean;
  leftLabel?: React.ReactNode;
  rightLabel?: React.ReactNode;
  currentValue?: React.ReactNode;
  enableRafThrottle?: boolean;
  onValueCommit?: (value: number[]) => void;
  // 新增：视觉风格
  variant?: "default" | "gradient" | "minimal";
  color?: "blue" | "purple" | "orange" | "green" | "red" | "gray";
}

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  SliderProps
>(
  (
    {
      className,
      defaultValue,
      value,
      min = 0,
      max = 100,
      showLabels = false,
      leftLabel,
      rightLabel,
      currentValue,
      enableRafThrottle = true,
      onValueChange,
      onValueCommit,
      variant = "gradient",
      color = "blue",
      ...props
    },
    ref
  ) => {
    const _values = React.useMemo(
      () =>
        Array.isArray(value)
          ? value
          : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
      [value, defaultValue, min, max]
    );

    const [internalValue, setInternalValue] = React.useState<number[]>(
      Array.isArray(value)
        ? (value as number[])
        : Array.isArray(defaultValue)
        ? (defaultValue as number[])
        : [min]
    );

    React.useEffect(() => {
      if (Array.isArray(value)) setInternalValue(value as number[]);
    }, [value]);

    const rafRef = React.useRef<number | null>(null);

    const emitChange = (next: number[]) => {
      if (!onValueChange) return;
      if (!enableRafThrottle) {
        onValueChange(next);
        return;
      }
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        onValueChange(next);
      });
    };

    const handleChange = (next: number[]) => {
      setInternalValue(next);
      emitChange(next);
    };

    const commit = () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        onValueChange?.(internalValue);
      }
      onValueCommit?.(internalValue);
    };

    // 颜色与风格类
    const colorClasses: Record<
      NonNullable<SliderProps["color"]>,
      { track: string; range: string; thumb: string }
    > = {
      blue: {
        track: "bg-gradient-to-r from-blue-100 to-blue-200",
        range: "bg-gradient-to-r from-blue-500 to-blue-600",
        thumb: "border-blue-500 hover:border-blue-600 focus:border-blue-600",
      },
      purple: {
        track: "bg-gradient-to-r from-purple-100 to-purple-200",
        range: "bg-gradient-to-r from-purple-500 to-purple-600",
        thumb:
          "border-purple-500 hover:border-purple-600 focus:border-purple-600",
      },
      orange: {
        track: "bg-gradient-to-r from-orange-100 to-orange-200",
        range: "bg-gradient-to-r from-orange-500 to-orange-600",
        thumb:
          "border-orange-500 hover:border-orange-600 focus:border-orange-600",
      },
      green: {
        track: "bg-gradient-to-r from-green-100 to-green-200",
        range: "bg-gradient-to-r from-green-500 to-green-600",
        thumb: "border-green-500 hover:border-green-600 focus:border-green-600",
      },
      red: {
        track: "bg-gradient-to-r from-red-100 to-red-200",
        range: "bg-gradient-to-r from-red-500 to-red-600",
        thumb: "border-red-500 hover:border-red-600 focus:border-red-600",
      },
      gray: {
        track: "bg-gradient-to-r from-gray-100 to-gray-200",
        range: "bg-gradient-to-r from-gray-500 to-gray-600",
        thumb: "border-gray-500 hover:border-gray-600 focus:border-gray-600",
      },
    };

    const trackVariant =
      variant === "gradient"
        ? colorClasses[color].track
        : variant === "minimal"
        ? "bg-gray-200"
        : "bg-secondary";
    const rangeVariant =
      variant === "gradient"
        ? colorClasses[color].range
        : variant === "minimal"
        ? "bg-gray-400"
        : "bg-primary";
    const thumbVariant =
      variant === "gradient"
        ? colorClasses[color].thumb
        : variant === "minimal"
        ? "border-gray-400 hover:border-gray-500 focus:border-gray-500"
        : "border-primary hover:border-primary/80 focus:border-primary";

    return (
      <div className={cn("w-full", className)}>
        <SliderPrimitive.Root
          ref={ref}
          data-slot="slider"
          defaultValue={defaultValue}
          value={value}
          min={min}
          max={max}
          className={cn(
            "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
            showLabels ? "mb-2" : undefined
          )}
          onValueChange={handleChange}
          onPointerUp={commit}
          {...props}
        >
          <SliderPrimitive.Track
            data-slot="slider-track"
            className={cn(
              "relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
              trackVariant
            )}
          >
            <SliderPrimitive.Range
              data-slot="slider-range"
              className={cn(
                "absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
                rangeVariant
              )}
            />
          </SliderPrimitive.Track>
          {Array.from({ length: _values.length }, (_, index) => (
            <SliderPrimitive.Thumb
              data-slot="slider-thumb"
              key={index}
              className={cn(
                "bg-background ring-ring/50 block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50",
                thumbVariant
              )}
            />
          ))}
        </SliderPrimitive.Root>
        {showLabels && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>{leftLabel}</span>
            <span>{currentValue}</span>
            <span>{rightLabel}</span>
          </div>
        )}
      </div>
    );
  }
);

Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
