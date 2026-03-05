import React from "react";
import { FileText, Download, BookOpen, Database, ClipboardList, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const resources = [
  {
    category: "Clinical Guidelines",
    icon: BookOpen,
    color: "bg-green-50 border-green-200",
    badgeColor: "bg-green-100 text-green-800",
    items: [
      {
        name: "Blood Analysis Guidelines",
        description: "Reference for interpreting lab markers and diagnostic criteria",
        type: "PDF",
        url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68fd57f1be4c19c6da8227d0/bloodanalysis.pdf"
      },
      {
        name: "Body Types Holistic Guide",
        description: "Liver, Adrenal, Thyroid, Pituitary, Ovarian body type classifications",
        type: "PDF",
        url: null
      },
      {
        name: "PCOS Holistic Plan",
        description: "Combined clinical guidelines for PCOS management and reversal",
        type: "PDF",
        url: null
      },
      {
        name: "Menopause Holistic Plan",
        description: "Nutritional and lifestyle guidelines for menopause",
        type: "PDF",
        url: null
      },
      {
        name: "Liver Holistic Plan",
        description: "Dietary and clinical guidelines for liver conditions",
        type: "PDF",
        url: null
      },
      {
        name: "BP Holistic Plan",
        description: "Blood pressure management through nutrition",
        type: "PDF",
        url: null
      },
      {
        name: "Thyroid Holistic Plan",
        description: "Hypothyroid and Hyperthyroid nutritional guidelines",
        type: "PDF",
        url: null
      },
    ]
  },
  {
    category: "Meal Planning Rules",
    icon: ClipboardList,
    color: "bg-orange-50 border-orange-200",
    badgeColor: "bg-orange-100 text-orange-800",
    items: [
      {
        name: "Logical Meal Planning Rules",
        description: "Core rules: protein-first approach, macro distribution, disease-specific logic",
        type: "PDF",
        url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68fd57f1be4c19c6da8227d0/LOGICALDESIGNINGOFMEALS.pdf"
      },
      {
        name: "Macro Calculation Formulas",
        description: "BMR, TDEE, IBW formulas and step-by-step macro distribution method",
        type: "PDF",
        url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68fd57f1be4c19c6da8227d0/67390c589_LOGICALDESIGNINGOFMEALS1.pdf"
      },
      {
        name: "Indian Meal Plan Trends",
        description: "Common logic rules for Indian meal patterns: complete meals, non-veg timing, variety rules",
        type: "PDF",
        url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68fd57f1be4c19c6da8227d0/a312ff819_INDIANMEALPATTERN.pdf"
      },
    ]
  },
  {
    category: "Dish & Nutrient Databases",
    icon: Database,
    color: "bg-blue-50 border-blue-200",
    badgeColor: "bg-blue-100 text-blue-800",
    items: [
      {
        name: "Dish Catalog Primary",
        description: "Primary database of Indian dishes with meal types, preferences, and calorie data (HEALTYHYFY DISHES 1.xlsx)",
        type: "Excel",
        url: null
      },
      {
        name: "Nutrient Database Secondary",
        description: "Clinical validator for micronutrients, ingredient-level nutritional data (HEALTHYFY DISHES 2.xlsx)",
        type: "Excel",
        url: null
      },
    ]
  }
];

const typeColors = {
  PDF: "bg-red-100 text-red-700",
  Excel: "bg-green-100 text-green-700",
};

export default function HealthyfyResources() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Healthyfy Resources</h1>
              <p className="text-sm text-gray-500">Clinical Guidelines & Meal Planning Source of Truth</p>
            </div>
          </div>
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <strong>Note:</strong> These documents are the official reference framework for the AI Meal Plan Generator. All meal plans generated must comply with these guidelines.
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-orange-600">7</p>
            <p className="text-xs text-gray-500 mt-1">Clinical Guidelines</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-green-600">3</p>
            <p className="text-xs text-gray-500 mt-1">Meal Planning Rules</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-blue-600">2</p>
            <p className="text-xs text-gray-500 mt-1">Dish & Nutrient Databases</p>
          </div>
        </div>

        {/* Resource Categories */}
        <div className="space-y-6">
          {resources.map((category) => (
            <Card key={category.category} className={`border-2 ${category.color}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <category.icon className="w-5 h-5" />
                  {category.category}
                  <Badge className={category.badgeColor}>{category.items.length} files</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {category.items.map((item) => (
                    <div key={item.name} className="flex items-start justify-between gap-4 bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                      <div className="flex items-start gap-3 flex-1">
                        <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{item.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={typeColors[item.type]}>{item.type}</Badge>
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Link pending</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}