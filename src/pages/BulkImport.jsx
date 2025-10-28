import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Calendar
} from "lucide-react";

export default function BulkImport() {
  const queryClient = useQueryClient();
  const [leadsFile, setLeadsFile] = useState(null);
  const [webinarFile, setWebinarFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleLeadsImport = async () => {
    if (!leadsFile) return;

    setImporting(true);
    setResult(null);

    try {
      // Upload file
      const uploadResult = await base44.integrations.Core.UploadFile({ file: leadsFile });
      const fileUrl = uploadResult.file_url;

      // Extract data
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: {
          type: "object",
          properties: {
            leads: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  full_name: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  lead_source: { type: "string" },
                  lead_score: { type: "string" },
                  city: { type: "string" },
                  notes: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (extractResult.status === "success") {
        const leads = extractResult.output.leads || [];
        
        // Bulk create leads
        const created = await Promise.all(
          leads.map(lead => 
            base44.entities.Lead.create({
              ...lead,
              lead_status: "new",
              pipeline_stage: "lead",
              lead_score: lead.lead_score || "warm"
            })
          )
        );

        setResult({
          success: true,
          count: created.length,
          message: `Successfully imported ${created.length} leads!`
        });

        queryClient.invalidateQueries(['leads']);
      } else {
        setResult({
          success: false,
          message: extractResult.details || "Failed to extract data"
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error.message || "Import failed"
      });
    } finally {
      setImporting(false);
    }
  };

  const handleWebinarImport = async () => {
    if (!webinarFile) return;

    setImporting(true);
    setResult(null);

    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file: webinarFile });
      const fileUrl = uploadResult.file_url;

      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: {
          type: "object",
          properties: {
            registrations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  full_name: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  webinar_title: { type: "string" },
                  webinar_date: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (extractResult.status === "success") {
        const registrations = extractResult.output.registrations || [];
        
        const created = await Promise.all(
          registrations.map(reg => 
            base44.entities.WebinarRegistration.create({
              ...reg,
              registration_date: new Date().toISOString(),
              attendance_status: "registered"
            })
          )
        );

        setResult({
          success: true,
          count: created.length,
          message: `Successfully imported ${created.length} webinar registrations!`
        });

        queryClient.invalidateQueries(['webinarRegs']);
      } else {
        setResult({
          success: false,
          message: extractResult.details || "Failed to extract data"
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error.message || "Import failed"
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadLeadsTemplate = () => {
    const csv = `full_name,email,phone,lead_source,lead_score,city,notes
Rajesh Kumar,rajesh@example.com,+91 9876543210,facebook_ad,hot,Mumbai,Interested in diabetes program
Priya Sharma,priya@example.com,+91 9876543211,instagram_ad,warm,Delhi,
Amit Patel,amit@example.com,+91 9876543212,google_ad,hot,Bangalore,`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_template.csv';
    a.click();
  };

  const downloadWebinarTemplate = () => {
    const csv = `full_name,email,phone,webinar_title,webinar_date
Rajesh Kumar,rajesh@example.com,+91 9876543210,Disease Reversal Masterclass,2025-02-15 18:00:00
Priya Sharma,priya@example.com,+91 9876543211,Disease Reversal Masterclass,2025-02-15 18:00:00`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'webinar_registrations_template.csv';
    a.click();
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Bulk Import Data</h1>
          <p className="text-gray-600">Upload CSV or Excel files to import leads and webinar registrations</p>
        </div>

        {/* Instructions */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader>
            <CardTitle>📋 How to Import</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 ml-6 list-decimal">
              <li className="text-gray-700">Download the template file for leads or webinar registrations</li>
              <li className="text-gray-700">Fill in your data in Excel or Google Sheets</li>
              <li className="text-gray-700">Save as CSV file</li>
              <li className="text-gray-700">Upload the file below</li>
            </ol>
          </CardContent>
        </Card>

        <Tabs defaultValue="leads" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur">
            <TabsTrigger value="leads">
              <Users className="w-4 h-4 mr-2" />
              Import Leads
            </TabsTrigger>
            <TabsTrigger value="webinar">
              <Calendar className="w-4 h-4 mr-2" />
              Import Webinar Registrations
            </TabsTrigger>
          </TabsList>

          {/* Import Leads */}
          <TabsContent value="leads">
            <div className="space-y-6">
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                  <CardTitle className="text-2xl">Import Leads from CSV/Excel</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Step 1: Download Template */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">Step 1: Download Template</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Download our template file with the correct column format
                    </p>
                    <Button onClick={downloadLeadsTemplate} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download Leads Template (CSV)
                    </Button>
                  </div>

                  {/* Step 2: Upload File */}
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">Step 2: Upload Your File</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Select your CSV or Excel file with leads data
                    </p>
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => setLeadsFile(e.target.files[0])}
                        className="flex-1 p-2 border rounded-lg"
                      />
                      <Button
                        onClick={handleLeadsImport}
                        disabled={!leadsFile || importing}
                        className="bg-gradient-to-r from-green-500 to-emerald-500"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {importing ? 'Importing...' : 'Import Leads'}
                      </Button>
                    </div>
                    {leadsFile && (
                      <p className="text-sm text-gray-600 mt-2">
                        Selected: {leadsFile.name}
                      </p>
                    )}
                  </div>

                  {/* Column Format Guide */}
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">📊 Required Columns</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="font-semibold">full_name</p>
                        <p className="text-gray-600">Required</p>
                      </div>
                      <div>
                        <p className="font-semibold">phone</p>
                        <p className="text-gray-600">Required</p>
                      </div>
                      <div>
                        <p className="font-semibold">email</p>
                        <p className="text-gray-600">Optional</p>
                      </div>
                      <div>
                        <p className="font-semibold">lead_source</p>
                        <p className="text-gray-600">Optional</p>
                      </div>
                      <div>
                        <p className="font-semibold">lead_score</p>
                        <p className="text-gray-600">hot/warm/cold</p>
                      </div>
                      <div>
                        <p className="font-semibold">city</p>
                        <p className="text-gray-600">Optional</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Import Webinar */}
          <TabsContent value="webinar">
            <div className="space-y-6">
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                  <CardTitle className="text-2xl">Import Webinar Registrations</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Step 1: Download Template */}
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">Step 1: Download Template</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Download template for webinar registrations
                    </p>
                    <Button onClick={downloadWebinarTemplate} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download Webinar Template (CSV)
                    </Button>
                  </div>

                  {/* Step 2: Upload File */}
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">Step 2: Upload Your File</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Select your CSV or Excel file with webinar registrations
                    </p>
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => setWebinarFile(e.target.files[0])}
                        className="flex-1 p-2 border rounded-lg"
                      />
                      <Button
                        onClick={handleWebinarImport}
                        disabled={!webinarFile || importing}
                        className="bg-gradient-to-r from-green-500 to-emerald-500"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {importing ? 'Importing...' : 'Import Registrations'}
                      </Button>
                    </div>
                    {webinarFile && (
                      <p className="text-sm text-gray-600 mt-2">
                        Selected: {webinarFile.name}
                      </p>
                    )}
                  </div>

                  {/* Column Format Guide */}
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">📊 Required Columns</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="font-semibold">full_name</p>
                        <p className="text-gray-600">Required</p>
                      </div>
                      <div>
                        <p className="font-semibold">email</p>
                        <p className="text-gray-600">Required</p>
                      </div>
                      <div>
                        <p className="font-semibold">phone</p>
                        <p className="text-gray-600">Required</p>
                      </div>
                      <div>
                        <p className="font-semibold">webinar_title</p>
                        <p className="text-gray-600">Required</p>
                      </div>
                      <div>
                        <p className="font-semibold">webinar_date</p>
                        <p className="text-gray-600">YYYY-MM-DD HH:MM</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Result Message */}
        {result && (
          <Alert className={`border-2 ${result.success ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
            {result.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <AlertDescription className="ml-2">
              <p className={`font-semibold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                {result.message}
              </p>
              {result.count && (
                <p className="text-sm mt-1">Total records imported: {result.count}</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Tips */}
        <Card className="border-none shadow-lg bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Important Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 ml-6 list-disc text-sm text-gray-700">
              <li>Make sure column names match exactly (case-sensitive)</li>
              <li>Phone numbers should include country code (e.g., +91 9876543210)</li>
              <li>Date format should be: YYYY-MM-DD HH:MM:SS</li>
              <li>Remove any special characters from names</li>
              <li>One row = one record</li>
              <li>Maximum 1000 records per import</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}