import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Users, Edit, Star, CheckCircle, Copy, AlertTriangle, Zap, Download, FileText, Table, Filter, X, Crown } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function TemplatesTab({
  templates, filteredTemplates, selectedClientId, setSelectedClientId,
  selectedClient, clients, mealPlans,
  searchQuery, setSearchQuery,
  templateFilters, setTemplateFilters,
  showDownloadOptions, setShowDownloadOptions,
  user, coachPlan,
  onOpenAssignDialog, onCloneTemplate,
  onAITemplateClick, onManualTemplateClick,
  onImportTemplate, onDownloadJSON, onDownloadExcel, onDownloadWord
}) {
  return (
    <div className="space-y-4">
      {templates.length === 0 ? (
        <Card className="border-none shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-12 text-center">
            <Star className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Create Your First Template!</h3>
            <p className="text-gray-600 mb-6">Templates save you money - use them unlimited times for FREE!</p>
            <div className="space-y-2 text-sm text-gray-700 text-left max-w-md mx-auto">
              <p>✅ Generate 1 AI meal plan (costs ₹{coachPlan?.ai_credit_price || 10})</p>
              <p>✅ Save it as template (FREE forever)</p>
              <p>✅ Use for 100 clients (₹0 instead of ₹{(coachPlan?.ai_credit_price || 10) * 100}!)</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Client Selector */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />Select Client to Assign Template
              </CardTitle>
              <CardDescription>⚠️ <strong>Important:</strong> First select a client, then choose a template to assign or customize.</CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedClientId && (
                <Alert className="mb-4 bg-yellow-50 border-yellow-300">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <AlertDescription className="text-yellow-900">
                    <strong>No client selected!</strong> Please choose a client from the dropdown below.
                  </AlertDescription>
                </Alert>
              )}
              <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="🔍 Choose a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => {
                    const hasActivePlan = mealPlans.filter(p => p.client_id === client.id).some(p => p.active);
                    return (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{client.full_name}</span>
                          <Badge variant="outline" className="text-xs capitalize">{client.food_preference}</Badge>
                          <Badge className="text-xs">{client.target_calories} kcal</Badge>
                          {hasActivePlan && <Badge className="text-xs bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Has Plan</Badge>}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {(user?.user_type === 'super_admin' || user?.user_type === 'team_member' || coachPlan?.can_generate_ai_templates) && (
            <div className="space-y-3">
              <div className="flex flex-col lg:flex-row gap-2 lg:gap-3">
                <Button onClick={onAITemplateClick}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 h-11 lg:h-12 w-full lg:flex-1 text-sm lg:text-base">
                  <Sparkles className="w-4 lg:w-5 h-4 lg:h-5 mr-1 lg:mr-2" />AI Generate Template
                </Button>
                <Button onClick={onManualTemplateClick} variant="outline"
                  className="h-11 lg:h-12 border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50 w-full lg:flex-1 text-sm lg:text-base">
                  <Edit className="w-4 lg:w-5 h-4 lg:h-5 mr-1 lg:mr-2" />Create Manual Template
                </Button>
              </div>
              <Card className="border-2 border-dashed border-green-300 bg-green-50/50">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 lg:gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-green-900 mb-1 text-sm lg:text-base">Import Meal Plan Template</p>
                      <p className="text-xs lg:text-sm text-green-700">Upload JSON, Excel (.xlsx), or Word/Text (.txt, .doc) file</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1.5 lg:gap-2 w-full lg:w-auto">
                      <div className="relative w-full lg:w-auto">
                        <Button onClick={() => setShowDownloadOptions(!showDownloadOptions)} variant="outline" size="sm"
                          className="border-green-600 text-green-700 hover:bg-green-100 w-full text-xs">
                          <Download className="w-3 h-3 mr-1" />Sample
                        </Button>
                        {showDownloadOptions && (
                          <div className="absolute top-full mt-1 right-0 bg-white border-2 border-green-500 rounded-lg shadow-lg z-10 w-48">
                            <button onClick={() => { onDownloadJSON(); setShowDownloadOptions(false); }}
                              className="w-full px-4 py-2 text-left hover:bg-green-50 flex items-center gap-2 text-sm">
                              <FileText className="w-4 h-4 text-blue-600" /><span>JSON Format</span>
                            </button>
                            <button onClick={() => { onDownloadExcel(); setShowDownloadOptions(false); }}
                              className="w-full px-4 py-2 text-left hover:bg-green-50 flex items-center gap-2 text-sm border-t">
                              <Table className="w-4 h-4 text-green-600" /><span>Excel Format</span>
                            </button>
                            <button onClick={() => { onDownloadWord(); setShowDownloadOptions(false); }}
                              className="w-full px-4 py-2 text-left hover:bg-green-50 flex items-center gap-2 text-sm border-t rounded-b-lg">
                              <FileText className="w-4 h-4 text-orange-600" /><span>Text/Word Format</span>
                            </button>
                          </div>
                        )}
                      </div>
                      <Button onClick={() => document.getElementById('import-template-file').click()} size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white w-full lg:w-auto text-xs">
                        <Download className="w-3 h-3 mr-1" />Import
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <input id="import-template-file" type="file" accept=".json,.xlsx,.xls,.txt,.doc,.docx" className="hidden" onChange={onImportTemplate} />
            </div>
          )}

          {user?.user_type === 'student_coach' && !coachPlan?.can_generate_ai_templates && (
            <Alert className="border-orange-500 bg-orange-50">
              <Crown className="w-5 h-5 text-orange-600" />
              <AlertDescription className="text-orange-900">
                <strong>Upgrade Required!</strong> AI Template Generation is not included in your plan.
                <Button onClick={() => window.location.href = createPageUrl('CoachSubscriptions')} variant="link"
                  className="p-0 h-auto ml-1 text-orange-700 underline">Upgrade your plan</Button> to access this feature.
              </AlertDescription>
            </Alert>
          )}

          {/* Filters */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Filter Templates</h3>
                </div>
                {(templateFilters.disease !== "all" || templateFilters.goal !== "all" || templateFilters.foodPreference !== "all" || templateFilters.regionalPreference !== "all" || templateFilters.calorieRange !== "all" || templateFilters.duration !== "all") && (
                  <Button variant="ghost" size="sm"
                    onClick={() => setTemplateFilters({ disease: "all", goal: "all", foodPreference: "all", regionalPreference: "all", calorieRange: "all", duration: "all" })}
                    className="text-red-600 hover:bg-red-50">
                    <X className="w-4 h-4 mr-1" />Clear Filters
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                {[
                  { key: "disease", label: "Disease Focus", options: [["all","All Diseases"],["diabetes_type1","Diabetes Type 1"],["diabetes_type2","Diabetes Type 2"],["hypertension","Hypertension"],["pcos","PCOS"],["thyroid_hypo","Hypothyroid"],["fatty_liver","Fatty Liver"],["high_cholesterol","High Cholesterol"],["ibs","IBS"],["gerd","GERD"]] },
                  { key: "goal", label: "Goal Target", options: [["all","All Goals"],["weight_loss","Weight Loss"],["weight_gain","Weight Gain"],["muscle_gain","Muscle Gain"],["diabetes","Diabetes"],["pcos","PCOS"],["thyroid","Thyroid"],["general","General Health"]] },
                  { key: "foodPreference", label: "Food Preference", options: [["all","All Types"],["veg","Vegetarian"],["non_veg","Non-Veg"],["eggetarian","Eggetarian"],["jain","Jain"]] },
                  { key: "regionalPreference", label: "Regional Preference", options: [["all","All Regions"],["north","North Indian"],["south","South Indian"],["west","West Indian"],["east","East Indian"]] },
                  { key: "calorieRange", label: "Calorie Range", options: [["all","All Ranges"],["low","Low (1000-1500 cal)"],["medium","Medium (1500-2000 cal)"],["high","High (2000-3000 cal)"]] },
                  { key: "duration", label: "Duration", options: [["all","All Durations"],["7","7 Days"],["10","10 Days"],["15","15 Days"],["21","21 Days"],["30","30 Days"]] }
                ].map(({ key, label, options }) => (
                  <div key={key} className="space-y-2">
                    <Label className="text-sm font-medium">{label}</Label>
                    <Select value={templateFilters[key]} onValueChange={(value) => setTemplateFilters({...templateFilters, [key]: value})}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {options.map(([val, lbl]) => <SelectItem key={val} value={val}>{lbl}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <Input placeholder="🔍 Search templates by name, category, tags..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-12 text-base" />
              <div className="flex items-center justify-between pt-2 border-t">
                <p className="text-sm text-gray-600">Showing <span className="font-semibold text-gray-900">{filteredTemplates.length}</span> of {templates.length} templates</p>
              </div>
            </CardContent>
          </Card>

          {/* Template Grid */}
          {filteredTemplates.length === 0 && searchQuery ? (
            <Card className="border-none shadow-lg"><CardContent className="p-12 text-center"><p className="text-gray-600">No templates found matching "{searchQuery}"</p></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all">
                  <CardHeader className="p-4 lg:p-6">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm lg:text-lg truncate">{template.name}</CardTitle>
                        <p className="text-xs lg:text-sm text-gray-600 mt-1 line-clamp-2">{template.description}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {template.is_public && <Badge className="bg-purple-100 text-purple-700 text-xs">Public</Badge>}
                        {template.created_by === user?.email && <Badge className="bg-blue-100 text-blue-700 text-xs">Mine</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 lg:p-6 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-orange-100 text-orange-700 capitalize text-xs">{template.food_preference}</Badge>
                      <Badge className="bg-blue-100 text-blue-700 text-xs">{template.target_calories} kcal</Badge>
                      <Badge className="bg-green-100 text-green-700 text-xs">{template.duration}d</Badge>
                    </div>
                    <div className="p-2 lg:p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs lg:text-sm font-semibold text-green-900">✅ Used {template.times_used || 0}x</p>
                      <p className="text-xs text-green-700">FREE!</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button onClick={() => onOpenAssignDialog(template)} disabled={!selectedClient}
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 text-xs h-9"
                        title={!selectedClient ? "Please select a client first" : "Assign template directly to client"}>
                        <CheckCircle className="w-3 h-3 mr-1" />Assign Now
                      </Button>
                      <Button onClick={() => onCloneTemplate(template)} disabled={!selectedClient} variant="outline"
                        className="w-full disabled:opacity-50 text-xs h-9"
                        title={!selectedClient ? "Please select a client first" : "Customize template before assigning"}>
                        <Copy className="w-3 h-3 mr-1" />Customize
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}