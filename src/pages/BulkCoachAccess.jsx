import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Download,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Crown
} from "lucide-react";
import { toast } from "sonner";

export default function BulkCoachAccess() {
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: plans } = useQuery({
    queryKey: ['coachPlans'],
    queryFn: () => base44.entities.HealthCoachPlan.list(),
    initialData: [],
  });

  const downloadTemplate = () => {
    const csvContent = `coach_email,coach_name,plan_name,billing_cycle,duration_months
coach1@example.com,Dr. John Doe,Mealie Pro,yearly,12
coach2@example.com,Dr. Jane Smith,Mealie Basic,monthly,3`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bulk_coach_access_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Template downloaded!");
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }
    return data;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setProcessing(true);
    setResults(null);

    try {
      const text = await file.text();
      const coaches = parseCSV(text);

      const response = await base44.functions.invoke('bulkGrantCoachAccess', {
        coaches: coaches
      });

      setResults(response.data);
      toast.success(`Processed ${coaches.length} coaches`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Failed to process file");
    } finally {
      setProcessing(false);
      event.target.value = '';
    }
  };

  if (user?.user_type !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            This feature is only available for platform administrators.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Bulk Health Coach Access
            </h1>
            <p className="text-gray-600">
              Grant subscription access to multiple health coaches at once
            </p>
          </div>
          <Crown className="w-12 h-12 text-purple-500" />
        </div>

        {/* Upload Section */}
        <Card className="border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-500" />
              Upload Coach Data
            </CardTitle>
            <CardDescription>
              Upload a CSV file with coach details to grant them subscription access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button onClick={downloadTemplate} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </Button>
              <label className="flex-1">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={processing}
                  className="hidden"
                />
                <Button
                  as="span"
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload CSV
                    </>
                  )}
                </Button>
              </label>
            </div>

            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>CSV Format:</strong> coach_email, coach_name, plan_name, billing_cycle (monthly/yearly), duration_months
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <Card className="border-2 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Processing Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-green-600">{results.summary?.success || 0}</p>
                  <p className="text-sm text-gray-600">Successful</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-red-600">{results.summary?.failed || 0}</p>
                  <p className="text-sm text-gray-600">Failed</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-blue-600">{results.summary?.total || 0}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
              </div>

              {results.results && results.results.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {results.results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 ${
                        result.success
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {result.success ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <p className="font-semibold text-gray-900">
                              {result.coach_name || result.coach_email}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600">{result.coach_email}</p>
                          {result.plan_name && (
                            <Badge className="mt-2 bg-purple-100 text-purple-700">
                              {result.plan_name}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          {result.success ? (
                            <Badge className="bg-green-500 text-white">Access Granted</Badge>
                          ) : (
                            <Badge className="bg-red-500 text-white">Failed</Badge>
                          )}
                        </div>
                      </div>
                      {result.message && (
                        <p className="text-sm text-gray-600 mt-2">{result.message}</p>
                      )}
                      {result.error && (
                        <p className="text-sm text-red-600 mt-2">{result.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-purple-600">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Download Template</h3>
                  <p className="text-sm text-gray-600">
                    Download the CSV template with the required format for coach data
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-pink-600">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Fill Coach Details</h3>
                  <p className="text-sm text-gray-600">
                    Add coach email, name, plan name (from available plans), billing cycle (monthly/yearly), and duration in months
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-orange-600">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Upload CSV</h3>
                  <p className="text-sm text-gray-600">
                    Upload the filled CSV file and the system will process all coaches
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-green-600">4</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Review Results</h3>
                  <p className="text-sm text-gray-600">
                    See which coaches were successfully granted access and any errors that occurred
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Plans */}
        {plans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Available Health Coach Plans</CardTitle>
              <CardDescription>Use these plan names in your CSV file</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="p-3 bg-gray-50 rounded-lg border">
                    <p className="font-semibold text-gray-900">{plan.plan_name}</p>
                    <p className="text-sm text-gray-600">
                      ₹{plan.monthly_price}/mo · ₹{plan.yearly_price}/yr
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}