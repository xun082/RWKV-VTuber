import { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RotateCcw, Save } from "lucide-react";

interface ConfigInputProps {
  icon: ComponentType<any>;
  label: string;
  badge: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  color: string;
  isModified: boolean;
  onReset: () => void;
  onSave: () => void;
  isMobile?: boolean;
}

export function ConfigInput({
  icon: Icon,
  label,
  badge,
  value,
  onChange,
  placeholder,
  type = "text",
  color,
  isModified,
  onReset,
  onSave,
  isMobile = false,
}: ConfigInputProps) {
  const buttonSize = isMobile ? "h-10 w-10" : "h-11 w-11";
  const inputHeight = isMobile ? "h-10" : "h-11";

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold flex items-center gap-2">
        <Icon className={`h-4 w-4 text-${color}-600`} />
        {label}
        <Badge variant="secondary" className="ml-2">
          {badge}
        </Badge>
      </Label>
      <div className="flex gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`${buttonSize} border-2 hover:bg-gray-50 transition-all duration-200 shrink-0`}
              onClick={onReset}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>恢复默认值</p>
          </TooltipContent>
        </Tooltip>
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 ${inputHeight} border-2 focus:border-${color}-500 transition-colors`}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isModified ? "default" : "outline"}
              size="icon"
              className={`${buttonSize} transition-all duration-200 shrink-0 ${
                isModified
                  ? `bg-gradient-to-r from-${color}-600 to-${color}-700 hover:from-${color}-700 hover:to-${color}-800 text-white shadow-lg hover:shadow-xl`
                  : "border-2 hover:bg-gray-50"
              }`}
              onClick={onSave}
            >
              <Save className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>保存修改</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
