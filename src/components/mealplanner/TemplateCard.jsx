import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Copy, Download } from "lucide-react";

export default function TemplateCard({ template, selectedClient, onAssign, onCustomize, user }) {
  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all">
      <CardHeader className="p-4 lg:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm lg:text-lg truncate">{template.name}</CardTitle>
            <p className="text-xs lg:text-sm text-gray-600 mt-1 line-clamp-2">{template.description}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {template.is_public && (
              <Badge className="bg-purple-100 text-purple-700 text-xs">Public</Badge>
            )}
            {template.created_by === user?.email && (
              <Badge className="bg-blue-100 text-blue-700 text-xs">Mine</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 lg:p-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-orange-100 text-orange-700 capitalize text-xs">
            {template.food_preference}
          </Badge>
          <Badge className="bg-blue-100 text-blue-700 text-xs">
            {template.target_calories} kcal
          </Badge>
          <Badge className="bg-green-100 text-green-700 text-xs">
            {template.duration}d
          </Badge>
        </div>

        <div className="p-2 lg:p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs lg:text-sm font-semibold text-green-900">
            ✅ Used {template.times_used || 0}x
          </p>
          <p className="text-xs text-green-700">FREE!</p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => onAssign(template)}
            disabled={!selectedClient}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs h-9"
            title={!selectedClient ? "Please select a client first" : "Assign template directly to client"}
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Assign Now
          </Button>
          <Button
            onClick={() => onCustomize(template)}
            disabled={!selectedClient}
            variant="outline"
            className="w-full disabled:opacity-50 disabled:cursor-not-allowed text-xs h-9"
            title={!selectedClient ? "Please select a client first" : "Customize template before assigning"}
          >
            <Copy className="w-3 h-3 mr-1" />
            Customize
          </Button>
          <Button
            onClick={() => {
              const csvData = [
                ['Day', 'Meal Type', 'Meal Name', 'Items', 'Portion Sizes', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fats (g)', 'Nutritional Tip']
              ];
              template.meals?.forEach(meal => {
                csvData.push([
                  meal.day,
                  meal.meal_type,
                  meal.meal_name,
                  meal.items.join(' | '),
                  meal.portion_sizes.join(' | '),
                  meal.calories,
                  meal.protein,
                  meal.carbs,
                  meal.fats,
                  meal.nutritional_tip
                ]);
              });
              const csv = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${template.name}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            variant="outline"
            className="w-full text-green-600 hover:bg-green-50 text-xs h-9 border border-green-500"
          >
            <Download className="w-3 h-3 mr-1" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}