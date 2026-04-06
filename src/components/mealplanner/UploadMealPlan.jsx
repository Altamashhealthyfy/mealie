import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, FileSpreadsheet, CheckCircle, AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function UploadMealPlan({ client, onSaved, onBack }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [planName, setPlanName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(null); // parsed meal data
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setExtracted(null);
    setError(null);
    if (!planName) setPlanName(f.name.replace(/\.[^.]+$/, ""));
  };

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    setError(null);
    try {
      // Upload the file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract meal data using AI
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            meals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "number" },
                  meal_type: { type: "string" },
                  meal_name: { type: "string" },
                  items: { type: "array", items: { type: "string" } },
                  portion_sizes: { type: "array", items: { type: "string" } },
                  calories: { type: "number" },
                  protein: { type: "number" },
                  carbs: { type: "number" },
                  fats: { type: "number" },
                }
              }
            },
            duration: { type: "number" },
            target_calories: { type: "number" },
          }
        }
      });

      if (result.status !== "success" || !result.output?.meals?.length) {
        throw new Error("Could not extract meal data from file. Please ensure the file contains structured meal plan data.");
      }

      setExtracted(result.output);
      toast.success(`Extracted ${result.output.meals.length} meal entries!`);
    } catch (e) {
      setError(e.message);
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async (assign = false) => {
    if (!extracted) return;
    setSaving(true);
    try {
      if (assign) {
        const existingPlans = await base44.entities.MealPlan.filter({ client_id: client.id });
        await Promise.all(existingPlans.map(p => base44.entities.MealPlan.update(p.id, { active: false })));
      }

      await base44.entities.MealPlan.create({
        client_id: client.id,
        name: planName || `Uploaded Plan — ${client.full_name}`,
        duration: extracted.duration || Math.max(...extracted.meals.map(m => m.day || 1)),
        meals: extracted.meals,
        target_calories: extracted.target_calories || null,
        food_preference: client.food_preference,
        regional_preference: client.regional_preference,
        plan_tier: "basic",
        meal_pattern: "daily",
        active: assign,
        decision_rules_applied: ["Uploaded from file"],
      });

      toast.success(assign ? "Plan saved and assigned!" : "Plan saved!");
      onSaved?.();
    } catch (e) {
      toast.error("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" /> Upload Meal Plan
        </h3>
        <p className="text-xs text-gray-500 mt-1">Upload an Excel (.xlsx) or CSV file containing a meal plan. AI will extract the data automatically.</p>
      </div>

      {/* Plan name */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">Plan Name</Label>
        <Input
          value={planName}
          onChange={e => setPlanName(e.target.value)}
          placeholder="e.g. 10-Day Diabetic Plan"
          className="text-sm"
        />
      </div>

      {/* File upload */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
        onClick={() => fileInputRef.current?.click()}
      >
        <FileSpreadsheet className="w-10 h-10 mx-auto text-gray-400 mb-2" />
        {file ? (
          <>
            <p className="text-sm font-semibold text-gray-700">{file.name}</p>
            <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">Click to select file</p>
            <p className="text-xs text-gray-400 mt-1">Supports .xlsx, .csv, .pdf</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Extract button */}
      {file && !extracted && (
        <Button
          onClick={handleExtract}
          disabled={extracting}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {extracting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extracting with AI…</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" /> Extract Meal Data</>
          )}
        </Button>
      )}

      {/* Error */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-700 text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Extracted preview */}
      {extracted && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="font-semibold text-green-800 text-sm">Extraction successful!</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs text-center">
            <div className="bg-white rounded-lg p-2">
              <p className="text-gray-400">Meals</p>
              <p className="font-bold text-gray-800">{extracted.meals?.length}</p>
            </div>
            <div className="bg-white rounded-lg p-2">
              <p className="text-gray-400">Days</p>
              <p className="font-bold text-gray-800">{extracted.duration || Math.max(...extracted.meals.map(m => m.day || 1))}</p>
            </div>
            <div className="bg-white rounded-lg p-2">
              <p className="text-gray-400">Target kcal</p>
              <p className="font-bold text-gray-800">{extracted.target_calories || "—"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Only"}
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving} className="bg-green-600 hover:bg-green-700 text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Assign"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}