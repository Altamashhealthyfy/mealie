import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AITemplateDialog({
  open, onOpenChange,
  aiTemplateForm, setAiTemplateForm,
  aiGeneratedTemplate, setAiGeneratedTemplate,
  generatingAITemplate,
  onGenerate,
  onSave,
  isSaving
}) {
  const defaultForm = {
    name: "", target_calories: "", food_preference: "veg", regional_preference: "all",
    duration: "7", description: "", disease_focus: [], goal: "", age: "", height: "",
    weight: "", bmi: "", bmi_file: null, weight_loss_target: "", portion_size: "medium"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-500" />
            AI Generate Complete Meal Plan Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Alert className="bg-orange-50 border-orange-500">
            <Sparkles className="w-5 h-5 text-orange-600" />
            <AlertDescription>
              AI will generate a complete {aiTemplateForm.duration}-day meal plan with ALL 6 meals per day ({parseInt(aiTemplateForm.duration) * 6} total meals) - ready to use unlimited times FREE!
            </AlertDescription>
          </Alert>

          {!aiGeneratedTemplate ? (
            <div className="space-y-4">
              {/* Portion Size */}
              <div className="space-y-2">
                <Label className="font-semibold text-gray-900">📏 Portion Size Reference Guide</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[{val:'small',label:'Small Bowl',g:'150gm'},{val:'medium',label:'Medium Bowl',g:'200gm'},{val:'large',label:'Large Bowl',g:'250gm'}].map(p => (
                    <button key={p.val} type="button" onClick={() => setAiTemplateForm({...aiTemplateForm, portion_size: p.val})}
                      className={`p-4 rounded-lg border-2 transition-all ${aiTemplateForm.portion_size === p.val ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-orange-300'}`}>
                      <p className="font-semibold text-gray-900">{p.label}</p>
                      <p className="text-gray-600">{p.g}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Biometrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" placeholder="30" value={aiTemplateForm.age}
                    onChange={(e) => setAiTemplateForm({...aiTemplateForm, age: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Height (cm)</Label>
                  <Input type="number" placeholder="170" value={aiTemplateForm.height}
                    onChange={(e) => {
                      const h = e.target.value;
                      let goal = aiTemplateForm.goal;
                      if (h && aiTemplateForm.weight) {
                        const bmi = aiTemplateForm.weight / Math.pow(h/100, 2);
                        goal = bmi > 25 ? 'weight_loss' : bmi < 18.5 ? 'weight_gain' : 'maintenance';
                      }
                      setAiTemplateForm({...aiTemplateForm, height: h, goal});
                    }} />
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input type="number" placeholder="70" value={aiTemplateForm.weight}
                    onChange={(e) => {
                      const w = e.target.value;
                      let goal = aiTemplateForm.goal;
                      if (aiTemplateForm.height && w) {
                        const bmi = w / Math.pow(aiTemplateForm.height/100, 2);
                        goal = bmi > 25 ? 'weight_loss' : bmi < 18.5 ? 'weight_gain' : 'maintenance';
                      }
                      setAiTemplateForm({...aiTemplateForm, weight: w, goal});
                    }} />
                </div>
                <div className="space-y-2">
                  <Label>BMI (Auto-calculated)</Label>
                  <Input type="text" disabled className="bg-gray-50"
                    value={aiTemplateForm.height && aiTemplateForm.weight
                      ? (aiTemplateForm.weight / Math.pow(aiTemplateForm.height/100, 2)).toFixed(1) : ''}
                    placeholder="Fill height and weight" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Target Calories (Auto-calculated)</Label>
                  <Input type="text" disabled className="bg-gray-50"
                    value={(() => {
                      if (!aiTemplateForm.age || !aiTemplateForm.height || !aiTemplateForm.weight) return '';
                      const a = parseFloat(aiTemplateForm.age), h = parseFloat(aiTemplateForm.height), w = parseFloat(aiTemplateForm.weight);
                      const bmr = ((10*w + 6.25*h - 5*a + 5) + (10*w + 6.25*h - 5*a - 161)) / 2;
                      const tdee = bmr * 1.375;
                      let cal = tdee;
                      if (aiTemplateForm.goal === 'weight_loss') cal = tdee - 500;
                      else if (['weight_gain','muscle_gain'].includes(aiTemplateForm.goal)) cal = tdee + 300;
                      return Math.round(cal);
                    })()}
                    placeholder="Fill age, height, weight, and select goal" />
                </div>
              </div>

              {/* Main config */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (days) *</Label>
                  <Select value={aiTemplateForm.duration} onValueChange={(v) => setAiTemplateForm({...aiTemplateForm, duration: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['7','10','15','21','30'].map(d => <SelectItem key={d} value={d}>{d} Days</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Goal Target * (Auto-selected)</Label>
                  <Select value={aiTemplateForm.goal} onValueChange={(v) => setAiTemplateForm({...aiTemplateForm, goal: v})}>
                    <SelectTrigger><SelectValue placeholder="Will auto-select based on BMI" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weight_loss">Weight Loss</SelectItem>
                      <SelectItem value="weight_gain">Weight Gain</SelectItem>
                      <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="health_improvement">Health Improvement</SelectItem>
                      <SelectItem value="disease_reversal">Disease Reversal</SelectItem>
                    </SelectContent>
                  </Select>
                  {aiTemplateForm.height && aiTemplateForm.weight && (
                    <p className="text-xs text-gray-600">
                      {(() => {
                        const bmi = aiTemplateForm.weight / Math.pow(aiTemplateForm.height/100, 2);
                        if (bmi > 25) return '⚠️ BMI > 25: Weight Loss recommended';
                        if (bmi < 18.5) return '⚠️ BMI < 18.5: Weight Gain recommended';
                        return '✅ BMI Normal: Maintenance recommended';
                      })()}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Food Preference *</Label>
                  <Select value={aiTemplateForm.food_preference} onValueChange={(v) => setAiTemplateForm({...aiTemplateForm, food_preference: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="veg">Vegetarian</SelectItem>
                      <SelectItem value="non_veg">Non-Veg</SelectItem>
                      <SelectItem value="eggetarian">Eggetarian</SelectItem>
                      <SelectItem value="jain">Jain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Regional Preference *</Label>
                  <Select value={aiTemplateForm.regional_preference} onValueChange={(v) => setAiTemplateForm({...aiTemplateForm, regional_preference: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="north">North Indian</SelectItem>
                      <SelectItem value="south">South Indian</SelectItem>
                      <SelectItem value="west">West Indian</SelectItem>
                      <SelectItem value="east">East Indian</SelectItem>
                      <SelectItem value="all">All Regions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Disease Focus */}
              <div className="space-y-2">
                <Label>Disease Focus (Optional)</Label>
                <div className="p-4 bg-gray-50 border rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      {value:"diabetes_type1",label:"Diabetes Type 1"},{value:"diabetes_type2",label:"Diabetes Type 2"},
                      {value:"prediabetes",label:"Prediabetes"},{value:"hypertension",label:"Hypertension"},
                      {value:"pcos",label:"PCOS"},{value:"thyroid_hypo",label:"Hypothyroid"},
                      {value:"thyroid_hyper",label:"Hyperthyroid"},{value:"fatty_liver",label:"Fatty Liver"},
                      {value:"high_cholesterol",label:"High Cholesterol"},{value:"ibs",label:"IBS"},
                      {value:"gerd",label:"GERD"},{value:"kidney_disease",label:"Kidney Disease"},
                      {value:"heart_disease",label:"Heart Disease"},
                    ].map((d) => (
                      <label key={d.value} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4"
                          checked={aiTemplateForm.disease_focus.includes(d.value)}
                          onChange={(e) => {
                            const nf = e.target.checked
                              ? [...aiTemplateForm.disease_focus, d.value]
                              : aiTemplateForm.disease_focus.filter(x => x !== d.value);
                            setAiTemplateForm({...aiTemplateForm, disease_focus: nf});
                          }} />
                        <span className="text-sm">{d.label}</span>
                      </label>
                    ))}
                  </div>
                  {aiTemplateForm.disease_focus.length > 0 && (
                    <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                      {aiTemplateForm.disease_focus.map(d => (
                        <Badge key={d} className="bg-red-100 text-red-700">{d.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={onGenerate} disabled={generatingAITemplate} className="w-full h-14 bg-gradient-to-r from-orange-500 to-red-500">
                {generatingAITemplate ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating {parseInt(aiTemplateForm.duration)*6} meals...</>
                ) : (
                  <><Sparkles className="w-5 h-5 mr-2" />Generate Complete Meal Plan</>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-500">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <AlertDescription>✅ Successfully generated {aiGeneratedTemplate.length} meals! Review and save as template.</AlertDescription>
              </Alert>

              <div className="p-4 bg-white border-2 rounded-lg max-h-64 overflow-y-auto">
                <h3 className="font-bold mb-3">Generated Meals Summary:</h3>
                {Array.from({ length: parseInt(aiTemplateForm.duration) }, (_, i) => i + 1).map(day => {
                  const dayMeals = aiGeneratedTemplate.filter(m => m.day === day);
                  return (
                    <div key={day} className="mb-3 p-3 bg-gray-50 rounded">
                      <p className="font-semibold text-sm">Day {day} ({dayMeals.length} meals):</p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        {dayMeals.map((meal, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="capitalize text-gray-600">{meal.meal_type.replace('_',' ')}:</span>
                            <span className="font-medium">{meal.meal_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input placeholder="e.g., Veg 1800 cal - 7 days Template" value={aiTemplateForm.name}
                    onChange={(e) => setAiTemplateForm({...aiTemplateForm, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea placeholder="Description" value={aiTemplateForm.description} rows={2}
                    onChange={(e) => setAiTemplateForm({...aiTemplateForm, description: e.target.value})} />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1"
                  onClick={() => { setAiGeneratedTemplate(null); setAiTemplateForm({...defaultForm}); }}>
                  Start Over
                </Button>
                <Button onClick={onSave} disabled={isSaving} className="flex-1 bg-green-500 h-12">
                  {isSaving ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Saving...</> : <><CheckCircle className="w-5 h-5 mr-2" />Save as Template</>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}