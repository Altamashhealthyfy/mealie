import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, CheckCircle, FileText, Trash2, TrendingUp, Activity, Pill, FlaskConical } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ClientMedicalProgress({ client }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [reportNote, setReportNote] = useState("");

  const { data: healthReports, isLoading } = useQuery({
    queryKey: ["healthReports", client?.id],
    queryFn: () => base44.entities.HealthReport.filter({ client_id: client?.id }),
    enabled: !!client?.id,
    initialData: [],
  });

  const { data: progressLogs } = useQuery({
    queryKey: ["clientProgressLogs", client?.id],
    queryFn: () => base44.entities.ProgressLog.filter({ client_id: client?.id }),
    enabled: !!client?.id,
    initialData: [],
  });

  const { data: clinicalIntakes } = useQuery({
    queryKey: ["clinicalIntakes", client?.id],
    queryFn: () => base44.entities.ClinicalIntake.filter({ client_id: client?.id }),
    enabled: !!client?.id,
    initialData: [],
  });

  const saveReportMutation = useMutation({
    mutationFn: (data) => base44.entities.HealthReport.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["healthReports", client?.id]);
      setReportNote("");
      toast.success("Medical report saved successfully!");
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id) => base44.entities.HealthReport.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["healthReports", client?.id]);
      toast.success("Report deleted.");
    },
  });

  const handleReportUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Use AI to extract data from report
      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical dietitian assistant. Extract all relevant medical/clinical data from this report/document and return structured JSON.
Extract these fields if present:
- title: string (document/report title)
- report_type: string (e.g. "Blood Test", "Thyroid Panel", "Diabetes Report", "Lipid Profile")
- health_conditions: array (detected conditions)
- lab_values: object with keys like hba1c, tsh, total_cholesterol, ldl, hdl, triglycerides, creatinine, vitamin_d, vitamin_b12, urea, gfr, sodium, potassium, sgot, sgpt, uric_acid, haemoglobin
- medications: array of strings
- key_findings: array of important findings
- doctor_recommendations: string
- report_date: string (date found in report, if any)
Return ONLY valid JSON.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            report_type: { type: "string" },
            health_conditions: { type: "array", items: { type: "string" } },
            lab_values: { type: "object" },
            medications: { type: "array", items: { type: "string" } },
            key_findings: { type: "array", items: { type: "string" } },
            doctor_recommendations: { type: "string" },
            report_date: { type: "string" },
          },
        },
      });

      await saveReportMutation.mutateAsync({
        client_id: client.id,
        report_title: extracted.title || file.name,
        report_type: extracted.report_type || "Medical Report",
        file_url,
        extracted_data: extracted,
        notes: reportNote || null,
        report_date: extracted.report_date || format(new Date(), "yyyy-MM-dd"),
      });
    } catch (err) {
      toast.error("Failed to process report. Please try again.");
      console.error(err);
    }
    setUploading(false);
    e.target.value = "";
  };

  const latestIntake = clinicalIntakes?.[0];
  const latestProgress = [...progressLogs].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const weightLost = client?.initial_weight && client?.weight
    ? (client.initial_weight - client.weight).toFixed(1)
    : null;

  return (
    <div className="space-y-5">
      {/* Progress Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Current Weight", value: client?.weight ? `${client.weight} kg` : "—", color: "text-blue-600" },
          { label: "Target Weight", value: client?.target_weight ? `${client.target_weight} kg` : "—", color: "text-green-600" },
          { label: "Weight Lost", value: weightLost !== null ? `${weightLost > 0 ? "-" : "+"}${Math.abs(weightLost)} kg` : "—", color: weightLost > 0 ? "text-green-600" : "text-orange-600" },
          { label: "Progress Logs", value: progressLogs.length, color: "text-purple-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Latest Progress Entry */}
      {latestProgress && (
        <Card className="border border-blue-100 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Latest Progress Log — {format(new Date(latestProgress.date), "MMM d, yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {latestProgress.weight && <div><p className="text-xs text-gray-500">Weight</p><p className="font-semibold">{latestProgress.weight} kg</p></div>}
              {latestProgress.wellness_metrics?.energy_level && <div><p className="text-xs text-gray-500">Energy</p><p className="font-semibold">{latestProgress.wellness_metrics.energy_level}/10</p></div>}
              {latestProgress.wellness_metrics?.sleep_quality && <div><p className="text-xs text-gray-500">Sleep</p><p className="font-semibold">{latestProgress.wellness_metrics.sleep_quality}/10</p></div>}
              {latestProgress.meal_adherence && <div><p className="text-xs text-gray-500">Meal Adherence</p><p className="font-semibold">{latestProgress.meal_adherence}%</p></div>}
              {latestProgress.wellness_metrics?.water_intake && <div><p className="text-xs text-gray-500">Water</p><p className="font-semibold">{latestProgress.wellness_metrics.water_intake}L</p></div>}
            </div>
            {latestProgress.notes && <p className="text-xs text-gray-600 mt-2 italic">"{latestProgress.notes}"</p>}
          </CardContent>
        </Card>
      )}

      {/* Clinical Intake Summary */}
      {latestIntake && (
        <Card className="border border-purple-100 bg-purple-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              Clinical Intake Summary
              {latestIntake.completed && <Badge className="bg-green-100 text-green-700 text-xs">Completed</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {latestIntake.health_conditions?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Health Conditions</p>
                <div className="flex flex-wrap gap-1">
                  {latestIntake.health_conditions.map((c, i) => (
                    <Badge key={i} className="bg-red-100 text-red-700 text-xs">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
            {latestIntake.current_medications?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Pill className="w-3 h-3" /> Medications</p>
                <div className="flex flex-wrap gap-1">
                  {latestIntake.current_medications.map((m, i) => (
                    <Badge key={i} className="bg-orange-100 text-orange-700 text-xs">{m.name} {m.dosage}</Badge>
                  ))}
                </div>
              </div>
            )}
            {latestIntake.lab_values && Object.keys(latestIntake.lab_values).length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FlaskConical className="w-3 h-3" /> Lab Values</p>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(latestIntake.lab_values).slice(0, 9).map(([key, val]) => (
                    <div key={key} className="bg-white rounded p-1.5">
                      <p className="text-xs text-gray-400 uppercase">{key.replace(/_/g, " ")}</p>
                      <p className="text-xs font-bold">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Medical Report Upload */}
      <Card className="border-2 border-dashed border-indigo-200 bg-indigo-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-600" />
            Upload New Medical Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Report Notes (optional)</Label>
            <Textarea
              value={reportNote}
              onChange={(e) => setReportNote(e.target.value)}
              placeholder="Add any notes about this report..."
              rows={2}
              className="text-sm"
            />
          </div>
          <label className={`flex items-center justify-center gap-2 w-full h-10 rounded-lg border cursor-pointer font-medium text-sm transition-all ${uploading ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90"}`}>
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing report with AI...</>
            ) : (
              <><Upload className="w-4 h-4" /> Upload Report (Image / PDF)</>
            )}
            {!uploading && <input type="file" accept="image/*,.pdf" onChange={handleReportUpload} className="hidden" />}
          </label>
          <p className="text-xs text-gray-400 text-center">AI will extract lab values, conditions, and medications automatically</p>
        </CardContent>
      </Card>

      {/* Existing Reports */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading reports...</div>
      ) : healthReports.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Uploaded Reports ({healthReports.length})</p>
          {[...healthReports].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map((report) => (
            <Card key={report.id} className="border border-gray-200">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      <p className="font-semibold text-sm truncate">{report.report_title || "Medical Report"}</p>
                      {report.report_type && <Badge className="bg-indigo-100 text-indigo-700 text-xs">{report.report_type}</Badge>}
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{report.report_date ? format(new Date(report.report_date), "MMM d, yyyy") : format(new Date(report.created_date), "MMM d, yyyy")}</p>
                    
                    {report.extracted_data?.health_conditions?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {report.extracted_data.health_conditions.map((c, i) => (
                          <Badge key={i} className="bg-red-100 text-red-700 text-xs">{c}</Badge>
                        ))}
                      </div>
                    )}
                    {report.extracted_data?.lab_values && Object.keys(report.extracted_data.lab_values).length > 0 && (
                      <p className="text-xs text-gray-500">{Object.keys(report.extracted_data.lab_values).length} lab values extracted</p>
                    )}
                    {report.notes && <p className="text-xs text-gray-500 italic mt-1">"{report.notes}"</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => window.open(report.file_url, "_blank")}>
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-red-500 hover:bg-red-50"
                      onClick={() => deleteReportMutation.mutate(report.id)}
                      disabled={deleteReportMutation.isPending}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Alert className="bg-gray-50 border-gray-200">
          <AlertDescription className="text-sm text-gray-500">No medical reports uploaded yet. Upload blood reports, lab results, or prescriptions above.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}