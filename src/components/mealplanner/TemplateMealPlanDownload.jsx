import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Download, Upload, Loader2, FileText, X, Table } from "lucide-react";
import * as XLSX from 'xlsx';

const MEAL_TYPE_ORDER = ["early_morning", "breakfast", "mid_morning", "lunch", "evening_snack", "dinner"];
const MEAL_TYPE_LABELS = {
  early_morning: "Early Morning",
  breakfast: "Breakfast",
  mid_morning: "Mid-Morning",
  lunch: "Lunch",
  evening_snack: "Evening Snack",
  dinner: "Dinner",
};

export default function TemplateMealPlanDownload({ template, open, onOpenChange }) {
  const [includeCalories, setIncludeCalories] = useState(true);
  const [letterheadUrl, setLetterheadUrl] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [uploadingLetterhead, setUploadingLetterhead] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleLetterheadUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLetterhead(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setLetterheadUrl(file_url);
    } catch {
      alert("Failed to upload letterhead");
    }
    setUploadingLetterhead(false);
  };

  // Group meals by day, sorted
  const groupedMeals = {};
  (template?.meals || []).forEach((meal) => {
    if (!groupedMeals[meal.day]) groupedMeals[meal.day] = [];
    groupedMeals[meal.day].push(meal);
  });
  const sortedDays = Object.keys(groupedMeals).sort((a, b) => parseInt(a) - parseInt(b));

  const downloadPDF = () => {
    setGenerating(true);
    try {
      let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; color: #111827; background: #fff; }
        .page { padding: 32px 40px; max-width: 900px; margin: 0 auto; }
        .letterhead-bar { display: flex; align-items: center; gap: 16px; padding-bottom: 16px; margin-bottom: 20px; border-bottom: 3px solid #ea580c; }
        .letterhead-logo { max-height: 70px; max-width: 200px; object-fit: contain; }
        .clinic-name-text { font-size: 22px; font-weight: 800; color: #ea580c; }
        h1 { font-size: 26px; color: #ea580c; margin-bottom: 6px; font-weight: 800; }
        .meta { font-size: 13px; color: #555; margin-bottom: 24px; }
        .meta strong { color: #111; }
        .day-header { background: #ea580c; color: white; padding: 10px 16px; font-size: 17px; font-weight: bold; border-radius: 8px; margin: 24px 0 12px 0; }
        .meal-block { background: #fff; border: 1px solid #f3f4f6; border-left: 4px solid #fb923c; border-radius: 0 8px 8px 0; padding: 14px 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .meal-type { font-size: 10px; text-transform: uppercase; color: #ea580c; font-weight: 700; letter-spacing: 0.8px; margin-bottom: 4px; }
        .meal-name { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 10px; }
        .items-table { width: 100%; border-collapse: collapse; }
        .items-table tr { border-bottom: 1px solid #f9fafb; }
        .items-table td { padding: 4px 2px; font-size: 13px; }
        .items-table td.item-name { color: #374151; }
        .items-table td.item-portion { color: #9ca3af; text-align: right; white-space: nowrap; padding-left: 12px; }
        .macros { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
        .macro-badge { border: 1px solid #e5e7eb; border-radius: 6px; padding: 3px 10px; font-size: 12px; font-weight: 500; color: #374151; background: #f9fafb; }
        .macro-badge.kcal { color: #ea580c; font-weight: 700; }
        .tip { font-size: 12px; color: #16a34a; font-style: italic; margin-top: 8px; padding: 6px 10px; background: #f0fdf4; border-radius: 4px; }
        .footer { margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 11px; color: #9ca3af; text-align: center; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .meal-block { break-inside: avoid; } }
      </style></head><body><div class="page">`;

      // Letterhead
      if (letterheadUrl || clinicName) {
        html += `<div class="letterhead-bar">`;
        if (letterheadUrl) html += `<img src="${letterheadUrl}" class="letterhead-logo" />`;
        if (clinicName) html += `<div class="clinic-name-text">${clinicName}</div>`;
        html += `</div>`;
      }

      html += `<h1>${template.name}</h1>
      <div class="meta">
        <strong>Duration:</strong> ${template.duration} Days &nbsp;|&nbsp;
        <strong>Food Pref:</strong> ${template.food_preference || '—'}${includeCalories ? ` &nbsp;|&nbsp; <strong>Target:</strong> ${template.target_calories} kcal/day` : ''}
        ${template.regional_preference ? ` &nbsp;|&nbsp; <strong>Region:</strong> ${template.regional_preference}` : ''}
      </div>`;

      sortedDays.forEach((day) => {
        const meals = (groupedMeals[day] || []).slice().sort(
          (a, b) => MEAL_TYPE_ORDER.indexOf(a.meal_type) - MEAL_TYPE_ORDER.indexOf(b.meal_type)
        );
        const dayTotal = meals.reduce((s, m) => s + (m.calories || 0), 0);

        html += `<div class="day-header">Day ${day}${includeCalories ? ` — ${Math.round(dayTotal)} kcal` : ''}</div>`;

        meals.forEach((meal) => {
          html += `<div class="meal-block">
            <div class="meal-type">${MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}</div>
            <div class="meal-name">${meal.meal_name}</div>
            <table class="items-table">`;
          (meal.items || []).forEach((item, i) => {
            const portion = meal.portion_sizes?.[i] || '';
            html += `<tr><td class="item-name">• ${item}</td><td class="item-portion">${portion}</td></tr>`;
          });
          html += `</table>`;
          if (includeCalories && meal.calories) {
            html += `<div class="macros">
              <span class="macro-badge kcal">🔥 ${meal.calories} kcal</span>
              ${meal.protein ? `<span class="macro-badge">P: ${meal.protein}g</span>` : ''}
              ${meal.carbs ? `<span class="macro-badge">C: ${meal.carbs}g</span>` : ''}
              ${meal.fats ? `<span class="macro-badge">F: ${meal.fats}g</span>` : ''}
            </div>`;
          }
          if (meal.nutritional_tip) {
            html += `<div class="tip">💡 ${meal.nutritional_tip}</div>`;
          }
          html += `</div>`;
        });
      });

      html += `<div class="footer">${clinicName || 'Template Meal Plan'} • ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>`;
      html += `</div></body></html>`;

      const printWindow = window.open('', '_blank');
      if (!printWindow) { alert('Popup blocked! Please allow popups and try again.'); return; }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
      onOpenChange(false);
    } catch (err) {
      alert('Failed to generate PDF');
      console.error(err);
    }
    setGenerating(false);
  };

  const downloadWord = () => {
    let content = '';
    if (clinicName) content += `${clinicName}\n${'='.repeat(clinicName.length)}\n\n`;
    content += `${template.name}\n${'='.repeat(template.name.length)}\n\n`;
    content += `Duration: ${template.duration} Days\n`;
    content += `Food Preference: ${template.food_preference || '—'}\n`;
    if (template.regional_preference) content += `Regional Preference: ${template.regional_preference}\n`;
    if (includeCalories && template.target_calories) content += `Target Calories: ${template.target_calories} kcal/day\n`;
    content += `\n`;

    sortedDays.forEach((day) => {
      const meals = (groupedMeals[day] || []).slice().sort(
        (a, b) => MEAL_TYPE_ORDER.indexOf(a.meal_type) - MEAL_TYPE_ORDER.indexOf(b.meal_type)
      );
      const dayTotal = meals.reduce((s, m) => s + (m.calories || 0), 0);
      content += `\n--- DAY ${day}${includeCalories ? ` (${Math.round(dayTotal)} kcal)` : ''} ---\n`;

      meals.forEach((meal) => {
        content += `\n  [${MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}]\n`;
        content += `  ${meal.meal_name}\n`;
        (meal.items || []).forEach((item, i) => {
          const portion = meal.portion_sizes?.[i] ? ` — ${meal.portion_sizes[i]}` : '';
          content += `    • ${item}${portion}\n`;
        });
        if (includeCalories && meal.calories) {
          content += `  Nutrition: ${meal.calories} kcal`;
          if (meal.protein) content += ` | P: ${meal.protein}g`;
          if (meal.carbs) content += ` | C: ${meal.carbs}g`;
          if (meal.fats) content += ` | F: ${meal.fats}g`;
          content += `\n`;
        }
        if (meal.nutritional_tip) content += `  💡 ${meal.nutritional_tip}\n`;
      });
    });

    content += `\n\n---\nGenerated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onOpenChange(false);
  };

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();

    // Info sheet
    const infoData = [
      { Field: 'Template Name', Value: template.name },
      { Field: 'Duration', Value: `${template.duration} Days` },
      { Field: 'Food Preference', Value: template.food_preference || '—' },
      { Field: 'Regional Preference', Value: template.regional_preference || '—' },
      ...(includeCalories ? [{ Field: 'Target Calories', Value: `${template.target_calories} kcal/day` }] : []),
      ...(clinicName ? [{ Field: 'Clinic/Brand', Value: clinicName }] : []),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(infoData), 'Template Info');

    // Meals sheet
    const mealsData = [];
    sortedDays.forEach((day) => {
      const meals = (groupedMeals[day] || []).slice().sort(
        (a, b) => MEAL_TYPE_ORDER.indexOf(a.meal_type) - MEAL_TYPE_ORDER.indexOf(b.meal_type)
      );
      meals.forEach((meal) => {
        const row = {
          Day: `Day ${day}`,
          'Meal Type': MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type,
          'Meal Name': meal.meal_name,
          Items: (meal.items || []).join(' | '),
          'Portion Sizes': (meal.portion_sizes || []).join(' | '),
          'Nutritional Tip': meal.nutritional_tip || '',
        };
        if (includeCalories) {
          row['Calories (kcal)'] = meal.calories || 0;
          row['Protein (g)'] = meal.protein || 0;
          row['Carbs (g)'] = meal.carbs || 0;
          row['Fats (g)'] = meal.fats || 0;
        }
        mealsData.push(row);
      });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mealsData), 'Meal Plan');

    XLSX.writeFile(wb, `${template.name.replace(/\s+/g, '_')}.xlsx`);
    onOpenChange(false);
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Download className="w-5 h-5 text-orange-500" />
            Download Template Meal Plan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          {/* Template summary */}
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 text-sm space-y-1">
            <p className="font-semibold text-orange-900">{template.name}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {template.food_preference && <Badge className="bg-green-100 text-green-700 text-xs capitalize">{template.food_preference}</Badge>}
              {template.target_calories && <Badge className="bg-orange-100 text-orange-700 text-xs">{template.target_calories} kcal</Badge>}
              {template.duration && <Badge className="bg-purple-100 text-purple-700 text-xs">{template.duration} Days</Badge>}
            </div>
          </div>

          {/* Include Calories Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label className="font-semibold">Include Calories & Macros</Label>
              <p className="text-xs text-gray-500">Show calorie and nutrition details</p>
            </div>
            <Switch checked={includeCalories} onCheckedChange={setIncludeCalories} />
          </div>

          {/* Letterhead / Branding */}
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
            <Label className="font-semibold">Letterhead (Optional)</Label>
            <p className="text-xs text-gray-500">Add your clinic/brand name and logo at the top of the document</p>

            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Clinic / Brand Name</Label>
              <input
                type="text"
                placeholder="e.g., Dr. Sharma's Nutrition Clinic"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Logo Image</Label>
              {letterheadUrl ? (
                <div className="relative">
                  <img src={letterheadUrl} alt="Letterhead" className="w-full h-16 object-contain border rounded-lg bg-white" />
                  <button
                    onClick={() => setLetterheadUrl('')}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  ><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-gray-300 hover:border-orange-400 hover:bg-orange-50 transition-colors">
                  {uploadingLetterhead ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Upload className="w-4 h-4 text-orange-500" />}
                  <span className="text-sm text-gray-600">{uploadingLetterhead ? 'Uploading...' : 'Upload Logo Image'}</span>
                  <input type="file" accept="image/*" onChange={handleLetterheadUpload} disabled={uploadingLetterhead} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Download Format Buttons */}
          <div className="space-y-2">
            <Label className="font-semibold text-sm">Choose Download Format</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={downloadPDF}
                disabled={generating}
                className="bg-gradient-to-r from-red-500 to-orange-500 h-12 flex flex-col items-center gap-0.5 text-xs"
              >
                <FileText className="w-4 h-4" />
                PDF
              </Button>
              <Button
                onClick={downloadWord}
                variant="outline"
                className="h-12 flex flex-col items-center gap-0.5 text-xs border-2 border-blue-500 text-blue-700 hover:bg-blue-50"
              >
                <FileText className="w-4 h-4" />
                Word (.txt)
              </Button>
              <Button
                onClick={downloadExcel}
                variant="outline"
                className="h-12 flex flex-col items-center gap-0.5 text-xs border-2 border-green-500 text-green-700 hover:bg-green-50"
              >
                <Table className="w-4 h-4" />
                Excel
              </Button>
            </div>
            <p className="text-xs text-center text-gray-400">PDF opens print dialog — choose "Save as PDF"</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}