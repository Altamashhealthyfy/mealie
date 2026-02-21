import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Filter } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function SegmentationFilterPanel({ segments, selectedSegments, onSegmentChange }) {
  const [openCategory, setOpenCategory] = useState(null);

  const categories = [
    { key: 'byAge', label: 'Age', color: 'blue' },
    { key: 'byGender', label: 'Gender', color: 'purple' },
    { key: 'byGoal', label: 'Health Goal', color: 'green' },
    { key: 'byFoodPreference', label: 'Food Preference', color: 'orange' },
    { key: 'byActivityLevel', label: 'Activity Level', color: 'pink' },
    { key: 'byStatus', label: 'Status', color: 'red' },
    { key: 'byProgress', label: 'Progress', color: 'indigo' },
    { key: 'byEngagement', label: 'Engagement', color: 'cyan' },
  ];

  const colorMap = {
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
    pink: 'bg-pink-100 text-pink-800 border-pink-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    cyan: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  };

  const formatSegmentKey = (key) => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const toggleSegment = (categoryKey, segmentKey) => {
    const id = `${categoryKey}-${segmentKey}`;
    const newSelected = selectedSegments.includes(id)
      ? selectedSegments.filter(s => s !== id)
      : [...selectedSegments, id];
    onSegmentChange(newSelected);
  };

  const clearAllFilters = () => {
    onSegmentChange([]);
  };

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5 text-orange-600" />
            Advanced Segmentation
          </CardTitle>
          {selectedSegments.length > 0 && (
            <Badge className="bg-orange-500 text-white">
              {selectedSegments.length} filters
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {categories.map((category) => {
            const segmentData = segments[category.key] || {};
            const segmentKeys = Object.keys(segmentData);
            const selectedCount = segmentKeys.filter(key =>
              selectedSegments.includes(`${category.key}-${key}`)
            ).length;

            return (
              <Popover key={category.key} open={openCategory === category.key} onOpenChange={(open) => setOpenCategory(open ? category.key : null)}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`justify-between ${selectedCount > 0 ? colorMap[category.color] : ''}`}
                  >
                    <span className="text-sm font-medium">{category.label}</span>
                    {selectedCount > 0 && (
                      <Badge className="bg-current text-white text-xs ml-1">
                        {selectedCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4" align="start">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-gray-900">
                      {category.label}
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {Object.entries(segmentData).map(([key, clients]) => {
                        const isSelected = selectedSegments.includes(`${category.key}-${key}`);
                        return (
                          <label key={key} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSegment(category.key, key)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900">
                                {formatSegmentKey(key)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {clients.length} clients
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>

        {selectedSegments.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedSegments.map(segment => {
                const [categoryKey, segmentKey] = segment.split('-');
                const category = categories.find(c => c.key === categoryKey);
                return (
                  <Badge
                    key={segment}
                    className={`${colorMap[category?.color]} border cursor-pointer hover:opacity-80`}
                    onClick={() => toggleSegment(categoryKey, segmentKey)}
                  >
                    {formatSegmentKey(segmentKey)}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}