import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { Download, Upload, Loader2, FileText, X } from "lucide-react";
import { toast } from "sonner";

export default function MealPlanPDFDownload({ plan, mpessData, open, onOpenChange }) {
  const [includeCalories, setIncludeCalories] = useState(true);
  const [includeMPESS, setIncludeMPESS] = useState(!!mpessData);
  const [letterheadUrl, setLetterheadUrl] = useState("");
  const [uploadingLetterhead, setUploadingLetterhead] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleLetterheadUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLetterhead(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setLetterheadUrl(file_url);
      toast.success("Letterhead uploaded!");
    } catch {
      toast.error("Failed to upload letterhead");
    }
    setUploadingLetterhead(false);
  };

  const mealTypeOrder = ["early_morning", "breakfast", "mid_morning", "lunch", "evening_snack", "dinner"];
  const mealTypeLabels = {
    early_morning: "Early Morning",
    breakfast: "Breakfast",
    mid_morning: "Mid-Morning",
    lunch: "Lunch",
    evening_snack: "Evening Snack",
    dinner: "Dinner",
  };

  const groupedMeals = {};
  plan?.meals?.forEach((meal) => {
    if (!groupedMeals[meal.day]) groupedMeals[meal.day] = [];
    groupedMeals[meal.day].push(meal);
  });

  const generatePDF = async () => {
    setGenerating(true);
    try {
      // Build HTML for PDF - exact same style as client view
      let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; color: #111827; background: #fff; }
        .page { padding: 32px 40px; max-width: 900px; margin: 0 auto; }
        .letterhead { width: 100%; max-height: 120px; object-fit: contain; margin-bottom: 20px; }
        h1 { font-size: 26px; color: #ea580c; margin-bottom: 6px; font-weight: 800; }
        .meta { font-size: 13px; color: #555; margin-bottom: 24px; }
        .meta strong { color: #111; }

        /* Day Header - orange full-width bar */
        .day-header {
          background: #ea580c;
          color: white;
          padding: 10px 16px;
          font-size: 17px;
          font-weight: bold;
          border-radius: 8px;
          margin: 24px 0 12px 0;
        }

        /* Meal Block - white card with orange left border */
        .meal-block {
          background: #fff;
          border: 1px solid #f3f4f6;
          border-left: 4px solid #fb923c;
          border-radius: 0 8px 8px 0;
          padding: 14px 16px;
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        .meal-type {
          font-size: 10px;
          text-transform: uppercase;
          color: #ea580c;
          font-weight: 700;
          letter-spacing: 0.8px;
          margin-bottom: 4px;
        }
        .meal-name {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 10px;
        }

        /* Items table - item on left, portion on right */
        .items-table { width: 100%; border-collapse: collapse; }
        .items-table tr { border-bottom: 1px solid #f9fafb; }
        .items-table td { padding: 4px 2px; font-size: 13px; }
        .items-table td.item-name { color: #374151; }
        .items-table td.item-portion { color: #9ca3af; text-align: right; white-space: nowrap; padding-left: 12px; }

        /* Macro badges row */
        .macros {
          display: flex;
          gap: 8px;
          margin-top: 10px;
          flex-wrap: wrap;
        }
        .macro-badge {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 3px 10px;
          font-size: 12px;
          font-weight: 500;
          color: #374151;
          background: #f9fafb;
        }
        .macro-badge.kcal { color: #ea580c; font-weight: 700; }

        /* Tip */
        .tip {
          font-size: 12px;
          color: #16a34a;
          font-style: italic;
          margin-top: 8px;
          padding: 6px 10px;
          background: #f0fdf4;
          border-radius: 4px;
        }

        /* MPESS */
        .mpess-section {
          margin-top: 36px;
          padding-top: 20px;
          border-top: 2px solid #ea580c;
        }
        .mpess-title {
          font-size: 20px;
          font-weight: 800;
          color: #ea580c;
          margin-bottom: 14px;
        }
        .mpess-category {
          font-size: 14px;
          font-weight: 700;
          color: #374151;
          margin: 12px 0 6px 0;
        }
        .mpess-item {
          font-size: 13px;
          color: #4b5563;
          margin: 3px 0 3px 12px;
        }

        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .meal-block { break-inside: avoid; }
        }
      </style></head><body><div class="page">`;

      if (letterheadUrl) {
        html += `<img src="${letterheadUrl}" class="letterhead" />`;
      }

      html += `<h1>${plan.plan_name || plan.name || "Meal Plan"}</h1>
      <div class="meta">
        <strong>Client:</strong> ${plan.client_name || "—"} &nbsp;|&nbsp;
        <strong>Duration:</strong> ${plan.duration} Days &nbsp;|&nbsp;
        <strong>Food Pref:</strong> ${plan.food_preference || "—"}${includeCalories ? ` &nbsp;|&nbsp; <strong>Target:</strong> ${plan.target_calories} kcal/day` : ""}
      </div>`;

      Object.keys(groupedMeals).sort((a, b) => parseInt(a) - parseInt(b)).forEach((day) => {
        const meals = groupedMeals[day].sort(
          (a, b) => mealTypeOrder.indexOf(a.meal_type) - mealTypeOrder.indexOf(b.meal_type)
        );
        const dayTotal = meals.reduce((s, m) => s + (m.calories || 0), 0);

        html += `<div class="day-header">Day ${day}${includeCalories ? ` — ${Math.round(dayTotal)} kcal` : ""}</div>`;

        meals.forEach((meal) => {
          html += `<div class="meal-block">
            <div class="meal-type">${mealTypeLabels[meal.meal_type] || meal.meal_type}</div>
            <div class="meal-name">${meal.meal_name}</div>
            <table class="items-table">`;
          meal.items?.forEach((item, i) => {
            const portion = meal.portion_sizes?.[i] || "";
            html += `<tr>
              <td class="item-name">• ${item}</td>
              <td class="item-portion">${portion}</td>
            </tr>`;
          });
          html += `</table>`;
          if (includeCalories) {
            html += `<div class="macros">
              <span class="macro-badge kcal">🔥 ${meal.calories} kcal</span>
              <span class="macro-badge">P: ${meal.protein}g</span>
              <span class="macro-badge">C: ${meal.carbs}g</span>
              <span class="macro-badge">F: ${meal.fats}g</span>
            </div>`;
          }
          if (meal.nutritional_tip) {
            html += `<div class="tip">💡 ${meal.nutritional_tip}</div>`;
          }
          if (meal.disease_rationale) {
            html += `<div class="tip">💡 ${meal.disease_rationale}</div>`;
          }
          html += `</div>`;
        });
      });

      // MPESS section
      if (includeMPESS && (mpessData || plan?.mpess_integration)) {
        html += `<div class="mpess-section"><div class="mpess-title">🧘 MPESS Wellness Integration</div>`;
        const categories = {
          mind_practices: "🧠 Mind Practices",
          physical_practices: "💪 Physical Practices",
          emotional_practices: "❤️ Emotional Practices",
          social_practices: "👥 Social Practices",
          spiritual_practices: "🙏 Spiritual Practices",
        };
        Object.entries(categories).forEach(([key, label]) => {
          const items = mpessData?.[key] || plan?.mpess_integration?.[key] || [];
          if (items.length > 0) {
            html += `<div class="mpess-category">${label}</div>`;
            items.forEach((item) => {
              html += `<div class="mpess-item">• ${item}</div>`;
            });
          }
        });
        html += `</div>`;
      }

      html += `</div></body></html>`;

      // Open in new window and trigger print/save as PDF
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Popup blocked! Please allow popups and try again.");
        setGenerating(false);
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to generate PDF");
      console.error(err);
    }
    setGenerating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            Download Diet Plan PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Letterhead */}
          <div>
            <Label className="font-semibold">Letterhead (Optional)</Label>
            <p className="text-xs text-gray-500 mb-2">Upload your clinic/brand letterhead image to appear at the top of the PDF</p>
            {letterheadUrl ? (
              <div className="relative">
                <img src={letterheadUrl} alt="Letterhead preview" className="w-full h-20 object-contain border rounded-lg bg-gray-50" />
                <button
                  onClick={() => setLetterheadUrl("")}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                ><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-gray-300 hover:border-orange-400 hover:bg-orange-50 transition-colors">
                {uploadingLetterhead ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Upload className="w-4 h-4 text-orange-500" />}
                <span className="text-sm text-gray-600">{uploadingLetterhead ? "Uploading..." : "Upload Letterhead Image"}</span>
                <input type="file" accept="image/*" onChange={handleLetterheadUpload} disabled={uploadingLetterhead} className="hidden" />
              </label>
            )}
          </div>

          {/* Include Calories Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label className="font-semibold">Include Calories & Macros</Label>
              <p className="text-xs text-gray-500">Show calorie and macro details in the PDF</p>
            </div>
            <Switch checked={includeCalories} onCheckedChange={setIncludeCalories} />
          </div>

          {/* Include MPESS Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label className="font-semibold">Include MPESS Section</Label>
              <p className="text-xs text-gray-500">Append Mind/Physical/Emotional/Social/Spiritual practices</p>
            </div>
            <Switch checked={includeMPESS} onCheckedChange={setIncludeMPESS} />
          </div>

          <Button
            onClick={generatePDF}
            disabled={generating}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 h-11"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> Download PDF</>
            )}
          </Button>
          <p className="text-xs text-center text-gray-400">A print dialog will open — choose "Save as PDF" to download</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}