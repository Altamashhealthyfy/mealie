import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText, Image, Video, Music, BarChart3, ChevronDown } from "lucide-react";

export default function ContentTypePicker({ selectedType, onTypeSelect, disabled }) {
  const contentTypes = [
    { id: 'file', label: 'File', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'photo', label: 'Photo', icon: Image, color: 'text-green-600', bg: 'bg-green-50' },
    { id: 'video', label: 'Video', icon: Video, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'audio', label: 'Audio', icon: Music, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'poll', label: 'Poll', icon: BarChart3, color: 'text-pink-600', bg: 'bg-pink-50' }
  ];

  const currentType = contentTypes.find(t => t.id === selectedType) || contentTypes[0];
  const CurrentIcon = currentType.icon;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-10 gap-2 border-2 hover:shadow-md transition-all ${currentType.bg} border-gray-200`}
          disabled={disabled}
        >
          <CurrentIcon className={`w-4 h-4 ${currentType.color}`} />
          <span className="font-medium text-gray-700">{currentType.label}</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 px-2 py-1">Share Content</p>
          {contentTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => onTypeSelect(type.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all hover:shadow-sm ${
                  selectedType === type.id 
                    ? `${type.bg} ${type.color} font-semibold` 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Icon className={`w-5 h-5 ${selectedType === type.id ? type.color : 'text-gray-400'}`} />
                <span className="text-sm">{type.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}