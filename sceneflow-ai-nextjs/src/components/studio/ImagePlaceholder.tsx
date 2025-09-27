import { Card } from "@/components/ui/Card";
import { Loader2 } from "lucide-react";

export const ImagePlaceholder = ({ title }: { title: string }) => {
  return (
    <div className="w-full h-48 rounded-t-xl overflow-hidden bg-gray-800 flex flex-col items-center justify-center text-center p-4">
      <Loader2 className="w-8 h-8 text-gray-500 animate-spin mb-3" />
      <p className="text-sm font-semibold text-gray-300">Generating Image</p>
      <p className="text-xs text-gray-400">"{title}"</p>
    </div>
  );
};
