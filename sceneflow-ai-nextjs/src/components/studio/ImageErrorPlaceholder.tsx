import { Card } from "@/components/ui/Card";
import { AlertTriangle } from "lucide-react";

export const ImageErrorPlaceholder = ({ error }: { error: string }) => {
  return (
    <div className="w-full h-48 rounded-t-xl overflow-hidden bg-red-900/20 flex flex-col items-center justify-center text-center p-4 border-b border-red-700">
      <AlertTriangle className="w-8 h-8 text-red-400 mb-3" />
      <p className="text-sm font-semibold text-red-300">Image Generation Failed</p>
      <p className="text-xs text-red-400 mt-1">{error}</p>
    </div>
  );
};
