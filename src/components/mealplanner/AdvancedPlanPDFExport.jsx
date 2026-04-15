import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Download, Upload, Loader2, FileText, X, Printer } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const MEAL_ORDER = ["early_morning", "breakfast", "mid_morning", "lunch", "evening_snack", "dinner", "post_dinner"];
const MEAL_LABELS = {
  early_morning: "Early Morning",
  breakfast: "Breakfast",
  mid_morning: "Mid-Morning",
  lunch: "Lunch",
  evening_snack: "Evening Snack",
  dinner: "Dinner",
  post_dinner: "Post Dinner",
};

function getMealLabel(raw = "") {
  const key = raw.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  return MEAL_LABELS[key] || raw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function AdvancedPlanPDFExport({ plan, clientName, open, onOpenChange }) {
  const [includeCalories, setIncludeCalories] = useState(true);
  const [includeMPESS, setIncludeMPESS] = useState(true);
  const [includeDisclaimer, setIncludeDisclaimer] = useState(true);
  const [customLetterheadUrl, setCustomLetterheadUrl] = useState("");
  const [uploadingLetterhead, setUploadingLetterhead] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Fetch coach profile for branding
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: coachProfile } = useQuery({
    queryKey: ["coachProfileForPDF", user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.CoachProfile.filter({ created_by: user?.email });
      return profiles[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const handleLetterheadUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLetterhead(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCustomLetterheadUrl(file_url);
      toast.success("Letterhead uploaded!");
    } catch {
      toast.error("Failed to upload letterhead");
    }
    setUploadingLetterhead(false);
  };

  const generatePDF = () => {
    setGenerating(true);
    try {
      // Group meals by day
      const groupedMeals = {};
      (plan?.meals || []).forEach((meal) => {
        const day = meal.day || 1;
        if (!groupedMeals[day]) groupedMeals[day] = [];
        groupedMeals[day].push(meal);
      });

      const brandName = coachProfile?.custom_branding_name || coachProfile?.business_name || "Mealie Health";
      const brandTagline = coachProfile?.tagline || "Personalized Clinical Nutrition";
      const logoUrl = customLetterheadUrl || coachProfile?.logo_url || "";
      const primaryColor = coachProfile?.theme_colors?.primary_from || "#ea580c";
      const phone = coachProfile?.phone || coachProfile?.whatsapp || "";
      const website = coachProfile?.website || "";
      const location = coachProfile?.location || "";
      const generatedDate = format(new Date(), "dd MMM yyyy");
      const planDuration = plan?.duration || Object.keys(groupedMeals).length;
      const targetCal = plan?.target_calories || "";

      // MPESS data
      const mpessArr = Array.isArray(plan?.mpess) ? plan.mpess : [];
      const mpessEntry = mpessArr[0] || null;

      let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${plan?.name || "Meal Plan"}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; background: #fff; }
    .page { max-width: 900px; margin: 0 auto; padding: 32px 40px; }

    /* HEADER */
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 20px; border-bottom: 3px solid ${primaryColor}; margin-bottom: 24px; }
    .brand-left { display: flex; align-items: center; gap: 16px; }
    .brand-logo { width: 64px; height: 64px; object-fit: contain; border-radius: 10px; }
    .brand-logo-placeholder { width: 64px; height: 64px; background: ${primaryColor}; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; }
    .brand-name { font-size: 22px; font-weight: 800; color: ${primaryColor}; }
    .brand-tagline { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .brand-contact { text-align: right; font-size: 11px; color: #6b7280; line-height: 1.7; }

    /* PLAN TITLE BANNER */
    .plan-banner { background: linear-gradient(135deg, ${primaryColor}, #dc2626); color: white; border-radius: 12px; padding: 18px 24px; margin-bottom: 20px; }
    .plan-title { font-size: 18px; font-weight: 800; margin-bottom: 6px; }
    .plan-meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; opacity: 0.92; }
    .plan-meta span { display: flex; align-items: center; gap: 4px; }

    /* CLIENT INFO */
    .client-info { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 20px; margin-bottom: 20px; display: flex; gap: 32px; flex-wrap: wrap; }
    .info-item { }
    .info-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-value { font-size: 13px; font-weight: 600; color: #111827; }

    /* DAY HEADER */
    .day-header { display: flex; align-items: center; gap: 10px; margin: 24px 0 12px 0; }
    .day-pill { background: ${primaryColor}; color: white; font-size: 12px; font-weight: 700; padding: 4px 14px; border-radius: 20px; }
    .day-total { font-size: 12px; color: #6b7280; }
    .day-line { flex: 1; height: 1px; background: #e5e7eb; }

    /* MEAL CARD */
    .meal-card { border: 1px solid #f3f4f6; border-left: 4px solid ${primaryColor}; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; background: #fffaf7; page-break-inside: avoid; }
    .meal-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
    .meal-type-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: ${primaryColor}; }
    .meal-name { font-size: 14px; font-weight: 700; color: #111827; margin-top: 2px; }
    .meal-cal-badge { background: #fff7ed; border: 1px solid #fed7aa; color: #c2410c; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }

    /* ITEMS TABLE */
    .items-list { margin: 8px 0; }
    .item-row { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; color: #374151; border-bottom: 1px solid #f3f4f6; }
    .item-row:last-child { border-bottom: none; }
    .item-name { display: flex; gap: 6px; }
    .item-dot { color: ${primaryColor}; }
    .item-portion { color: #9ca3af; font-size: 11px; }

    /* MACROS */
    .macros-row { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
    .macro-chip { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 3px 10px; font-size: 11px; color: #374151; }
    .macro-chip strong { color: #111827; }

    /* TIP */
    .meal-tip { background: #eff6ff; border-left: 3px solid #3b82f6; padding: 6px 10px; border-radius: 4px; font-size: 11px; color: #1d4ed8; font-style: italic; margin-top: 8px; }

    /* MPESS SECTION */
    .mpess-section { margin-top: 36px; border-top: 2px solid #7c3aed; padding-top: 20px; page-break-before: always; }
    .mpess-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .mpess-title { font-size: 16px; font-weight: 800; color: #7c3aed; }
    .mpess-subtitle { font-size: 12px; color: #9ca3af; }
    .mpess-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .mpess-item { background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 12px 14px; }
    .mpess-item-label { font-size: 11px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .mpess-item-text { font-size: 12px; color: #4c1d95; line-height: 1.5; }

    /* DISCLAIMER */
    .disclaimer { margin-top: 28px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px 16px; font-size: 11px; color: #92400e; line-height: 1.6; }
    .disclaimer strong { color: #78350f; }

    /* FOOTER */
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 10px; color: #9ca3af; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 20px 28px; }
      .mpess-section { page-break-before: always; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="brand-left">`;

      if (logoUrl) {
        html += `<img src="${logoUrl}" class="brand-logo" alt="Logo" />`;
      } else {
        html += `<div class="brand-logo-placeholder">${brandName.charAt(0)}</div>`;
      }

      html += `
      <div>
        <div class="brand-name">${brandName}</div>
        <div class="brand-tagline">${brandTagline}</div>
      </div>
    </div>
    <div class="brand-contact">
      ${phone ? `📞 ${phone}<br/>` : ""}
      ${website ? `🌐 ${website}<br/>` : ""}
      ${location ? `📍 ${location}<br/>` : ""}
      📅 Generated: ${generatedDate}
    </div>
  </div>

  <!-- PLAN BANNER -->
  <div class="plan-banner">
    <div class="plan-title">💎 Advanced Clinical Meal Plan</div>
    <div class="plan-meta">
      <span>📅 ${planDuration} Days</span>
      ${targetCal && includeCalories ? `<span>🔥 Target: ${targetCal} kcal/day</span>` : ""}
      ${plan?.food_preference ? `<span>🥗 ${plan.food_preference}</span>` : ""}
      ${plan?.disease_focus?.length ? `<span>🏥 ${plan.disease_focus.join(", ")}</span>` : ""}
    </div>
  </div>

  <!-- CLIENT INFO -->
  <div class="client-info">
    <div class="info-item">
      <div class="info-label">Client</div>
      <div class="info-value">${clientName || "—"}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Plan Name</div>
      <div class="info-value">${plan?.name?.split("—")[1]?.trim() || plan?.name || "—"}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Duration</div>
      <div class="info-value">${planDuration} Days</div>
    </div>
    ${targetCal && includeCalories ? `<div class="info-item"><div class="info-label">Daily Target</div><div class="info-value">${targetCal} kcal</div></div>` : ""}
  </div>`;

      // Meal days
      const sortedDays = Object.keys(groupedMeals).sort((a, b) => parseInt(a) - parseInt(b));
      sortedDays.forEach((day) => {
        const meals = (groupedMeals[day] || []).sort(
          (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
        );
        const dayTotal = meals.reduce((s, m) => s + (m.calories || 0), 0);
        const dayProt = meals.reduce((s, m) => s + (m.protein || 0), 0);

        html += `
  <div class="day-header">
    <span class="day-pill">Day ${day}</span>
    ${includeCalories ? `<span class="day-total">${Math.round(dayTotal)} kcal · P: ${Math.round(dayProt)}g</span>` : ""}
    <div class="day-line"></div>
  </div>`;

        meals.forEach((meal) => {
          html += `
  <div class="meal-card">
    <div class="meal-top">
      <div>
        <div class="meal-type-label">${getMealLabel(meal.meal_type || "")}</div>
        <div class="meal-name">${meal.meal_name || "—"}</div>
      </div>
      ${meal.calories && includeCalories ? `<div class="meal-cal-badge">🔥 ${meal.calories} kcal</div>` : ""}
    </div>

    <div class="items-list">`;

          (meal.items || []).forEach((item, i) => {
            html += `
      <div class="item-row">
        <div class="item-name"><span class="item-dot">•</span>${item}</div>
        <div class="item-portion">${meal.portion_sizes?.[i] || ""}</div>
      </div>`;
          });

          html += `</div>`;

          if (includeCalories && (meal.protein || meal.carbs || meal.fats)) {
            html += `
    <div class="macros-row">
      ${meal.protein ? `<div class="macro-chip"><strong>P:</strong> ${meal.protein}g</div>` : ""}
      ${meal.carbs ? `<div class="macro-chip"><strong>C:</strong> ${meal.carbs}g</div>` : ""}
      ${meal.fats ? `<div class="macro-chip"><strong>F:</strong> ${meal.fats}g</div>` : ""}
    </div>`;
          }

          if (meal.nutritional_tip || meal.disease_rationale) {
            html += `<div class="meal-tip">💡 ${meal.nutritional_tip || meal.disease_rationale}</div>`;
          }

          html += `</div>`;
        });
      });

      // MPESS Section
      if (includeMPESS && mpessEntry && (mpessEntry.sleep || mpessEntry.movement || mpessEntry.stress || mpessEntry.mindfulness || mpessEntry.pranayam)) {
        html += `
  <div class="mpess-section">
    <div class="mpess-header">
      <div>
        <div class="mpess-title">🌿 MPESS — Holistic Wellness Guidance</div>
        <div class="mpess-subtitle">Mind · Physical · Emotional · Social · Spiritual</div>
      </div>
    </div>
    <div class="mpess-grid">`;

        const mpessFields = [
          { key: "sleep", label: "😴 Sleep", icon: "" },
          { key: "stress", label: "🧘 Stress Management", icon: "" },
          { key: "movement", label: "🏃 Physical Movement", icon: "" },
          { key: "mindfulness", label: "🧠 Mindfulness", icon: "" },
          { key: "pranayam", label: "🌬️ Pranayam", icon: "" },
        ];

        mpessFields.forEach(({ key, label }) => {
          if (mpessEntry[key]) {
            html += `
      <div class="mpess-item">
        <div class="mpess-item-label">${label}</div>
        <div class="mpess-item-text">${mpessEntry[key]}</div>
      </div>`;
          }
        });

        html += `</div></div>`;
      }

      // Disclaimer
      if (includeDisclaimer) {
        html += `
  <div class="disclaimer">
    <strong>⚠️ Medical Disclaimer:</strong> This meal plan is generated based on the clinical intake provided and is intended for educational and nutritional guidance purposes only. It does not replace professional medical advice, diagnosis, or treatment. Always consult a qualified dietitian or healthcare professional before making significant dietary changes. Regular monitoring and follow-ups are essential.
  </div>`;
      }

      // Footer
      html += `
  <div class="footer">
    <span>${brandName} · ${brandTagline}</span>
    <span>Generated on ${generatedDate} · For ${clientName || "client"} only</span>
  </div>

</div>
</body></html>`;

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
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
      onOpenChange(false);
      toast.success("PDF ready — choose 'Save as PDF' in the print dialog!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    }
    setGenerating(false);
  };

  const brandName = coachProfile?.custom_branding_name || coachProfile?.business_name || "Mealie Health";
  const logoUrl = customLetterheadUrl || coachProfile?.logo_url || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Export Advanced Meal Plan PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Branding Preview */}
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
            <p className="text-xs font-semibold text-purple-700 mb-2">📋 PDF Branding</p>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-contain bg-white border" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold">
                  {brandName.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-semibold text-sm text-gray-800">{brandName}</p>
                <p className="text-xs text-gray-500">{coachProfile?.tagline || "Clinical Nutrition Plan"}</p>
              </div>
            </div>
          </div>

          {/* Custom Letterhead Override */}
          <div>
            <Label className="font-semibold text-sm">Custom Letterhead (Optional)</Label>
            <p className="text-xs text-gray-500 mb-2">Override your logo with a custom letterhead image</p>
            {customLetterheadUrl ? (
              <div className="relative">
                <img src={customLetterheadUrl} alt="Letterhead" className="w-full h-16 object-contain border rounded-lg bg-gray-50" />
                <button
                  onClick={() => setCustomLetterheadUrl("")}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 transition-colors">
                {uploadingLetterhead ? <Loader2 className="w-4 h-4 animate-spin text-purple-500" /> : <Upload className="w-4 h-4 text-purple-500" />}
                <span className="text-sm text-gray-600">{uploadingLetterhead ? "Uploading..." : "Upload Custom Letterhead"}</span>
                <input type="file" accept="image/*" onChange={handleLetterheadUpload} disabled={uploadingLetterhead} className="hidden" />
              </label>
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="font-semibold text-sm">Include Calories & Macros</Label>
                <p className="text-xs text-gray-500">Show nutritional values in the PDF</p>
              </div>
              <Switch checked={includeCalories} onCheckedChange={setIncludeCalories} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="font-semibold text-sm">Include MPESS Section</Label>
                <p className="text-xs text-gray-500">Append holistic wellness guidance</p>
              </div>
              <Switch checked={includeMPESS} onCheckedChange={setIncludeMPESS} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="font-semibold text-sm">Include Medical Disclaimer</Label>
                <p className="text-xs text-gray-500">Recommended for sharing with clients</p>
              </div>
              <Switch checked={includeDisclaimer} onCheckedChange={setIncludeDisclaimer} />
            </div>
          </div>

          <Button
            onClick={generatePDF}
            disabled={generating}
            className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Printer className="w-4 h-4 mr-2" /> Generate & Print PDF</>
            )}
          </Button>
          <p className="text-xs text-center text-gray-400">A print dialog will open — select "Save as PDF" to download</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}