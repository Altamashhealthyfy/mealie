import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Calendar,
  GraduationCap,
  Heart,
  Award,
  Lock,
  Crown
} from "lucide-react";
import { useCoachPlanPermissions } from "@/components/permissions/useCoachPlanPermissions";
import { createPageUrl } from "@/utils";

export default function BulkImport() {
  const { user, canUseBulkImport, isLoading: permissionsLoading } = useCoachPlanPermissions();
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  // Check access for student_coach
  if (!permissionsLoading && user?.user_type === 'student_coach' && !canUseBulkImport) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl bg-gradient-to-br from-yellow-50 to-amber-50">
          <CardHeader>
            <Lock className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <CardTitle className="text-center text-2xl">Feature Not Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Bulk Import is not included in your current plan.
            </p>
            <Alert className="bg-white border-yellow-300">
              <Crown className="w-5 h-5 text-yellow-600" />
              <AlertDescription>
                Upgrade your plan to bulk import clients and data.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => window.location.href = createPageUrl('CoachSubscriptions')}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-500"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleImport = async (type, vertical) => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResult.file_url;

      let schema, entityName, processData;

      if (type === 'clients') {
        schema = {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  full_name: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  age: { type: "number" },
                  gender: { type: "string" },
                  height: { type: "number" },
                  weight: { type: "number" },
                  target_weight: { type: "number" },
                  goal: { type: "string" },
                  food_preference: { type: "string" },
                  regional_preference: { type: "string" },
                  notes: { type: "string" }
                }
              }
            }
          }
        };
        entityName = 'Client';
        processData = (data) => data.map(client => ({
          ...client,
          status: "active",
          join_date: new Date().toISOString().split('T')[0],
          initial_weight: client.weight
        }));
      } else if (type === 'leads') {
        schema = {
          type: "object",
          properties: {
            data: {
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
        };
        entityName = 'Lead';
        processData = (data) => data.map(lead => ({
          ...lead,
          business_vertical: vertical,
          lead_status: "new",
          pipeline_stage: "lead",
          lead_score: lead.lead_score || "warm"
        }));
      } else if (type === 'webinar') {
        schema = {
          type: "object",
          properties: {
            data: {
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
        };
        entityName = 'WebinarRegistration';
        processData = (data) => data.map(reg => ({
          ...reg,
          registration_date: new Date().toISOString(),
          attendance_status: "registered"
        }));
      } else if (type === 'showcase') {
        schema = {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  full_name: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  showcase_type: { type: "string" },
                  showcase_date: { type: "string" },
                  came_from: { type: "string" }
                }
              }
            }
          }
        };
        entityName = 'Showcase';
        processData = (data) => data.map(s => ({
          ...s,
          registration_date: new Date().toISOString(),
          attendance_status: "registered",
          purchased: false,
          follow_up_status: "pending"
        }));
      } else if (type === 'challenge') {
        schema = {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  full_name: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  challenge_name: { type: "string" },
                  challenge_type: { type: "string" },
                  start_date: { type: "string" }
                }
              }
            }
          }
        };
        entityName = 'Challenge';
        processData = (data) => data.map(c => ({
          ...c,
          registration_date: new Date().toISOString(),
          attendance_status: "registered",
          purchased_after_challenge: false,
          follow_up_status: "pending",
          days_attended: 0
        }));
      }

      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: schema
      });

      if (extractResult.status === "success") {
        const records = extractResult.output.data || [];
        const processedData = processData(records);
        
        const created = await Promise.all(
          processedData.map(record => 
            base44.entities[entityName].create(record)
          )
        );

        setResult({
          success: true,
          count: created.length,
          message: `Successfully imported ${created.length} records!`
        });

        queryClient.invalidateQueries([entityName.toLowerCase()]);
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
      setFile(null);
    }
  };

  const downloadTemplate = (type, vertical) => {
    let csv = '';
    let filename = '';

    if (type === 'clients') {
      csv = `full_name,email,phone,age,gender,height,weight,target_weight,goal,food_preference,regional_preference,notes
Rajesh Kumar,rajesh@example.com,+91 9876543210,35,male,175,85,75,weight_loss,veg,north,Wants to lose weight
Priya Sharma,priya@example.com,+91 9876543211,28,female,160,65,60,weight_loss,veg,south,PCOS management
Amit Patel,amit@example.com,+91 9876543212,42,male,170,90,80,health_improvement,non_veg,west,Diabetes control`;
      filename = 'client_profiles_template.csv';
    } else if (type === 'leads') {
      csv = `full_name,email,phone,lead_source,lead_score,city,notes
Rajesh Kumar,rajesh@example.com,+91 9876543210,facebook_ad,hot,Mumbai,Interested in program
Priya Sharma,priya@example.com,+91 9876543211,google_ad,warm,Delhi,
Amit Patel,amit@example.com,+91 9876543212,referral,hot,Bangalore,`;
      filename = `${vertical}_leads_template.csv`;
    } else if (type === 'webinar') {
      csv = `full_name,email,phone,webinar_title,webinar_date
Rajesh Kumar,rajesh@example.com,+91 9876543210,Health Coach Masterclass,2025-02-15 18:00:00
Priya Sharma,priya@example.com,+91 9876543211,Health Coach Masterclass,2025-02-15 18:00:00`;
      filename = 'webinar_registrations_template.csv';
    } else if (type === 'showcase') {
      csv = `full_name,email,phone,showcase_type,showcase_date,came_from
Rajesh Kumar,rajesh@example.com,+91 9876543210,diploma_showcase,2025-02-20 18:00:00,silver_buyer
Priya Sharma,priya@example.com,+91 9876543211,diamond_showcase,2025-02-25 18:00:00,diploma_buyer`;
      filename = 'showcase_registrations_template.csv';
    } else if (type === 'challenge') {
      csv = `full_name,email,phone,challenge_name,challenge_type,start_date
Rajesh Kumar,rajesh@example.com,+91 9876543210,5 Day Health Challenge,3_7_days_health,2025-02-15
Priya Sharma,priya@example.com,+91 9876543211,Prosperity Challenge,5_days_prosperity,2025-02-20`;
      filename = 'challenge_registrations_template.csv';
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Bulk Import Data</h1>
          <p className="text-gray-600">Upload CSV or Excel files to import data</p>
        </div>

        {/* Instructions */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader>
            <CardTitle>📋 How to Import</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 ml-6 list-decimal">
              <li className="text-gray-700">Download the appropriate template file</li>
              <li className="text-gray-700">Fill in your data in Excel or Google Sheets</li>
              <li className="text-gray-700">Save as CSV file</li>
              <li className="text-gray-700">Upload the file below</li>
            </ol>
          </CardContent>
        </Card>

        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur grid grid-cols-4">
            <TabsTrigger value="clients">
              <Users className="w-4 h-4 mr-2" />
              Client Profiles
            </TabsTrigger>
            <TabsTrigger value="coach">
              <GraduationCap className="w-4 h-4 mr-2" />
              Health Coach Training
            </TabsTrigger>
            <TabsTrigger value="health">
              <Heart className="w-4 h-4 mr-2" />
              Health/Disease Management
            </TabsTrigger>
            <TabsTrigger value="prosperity">
              <Award className="w-4 h-4 mr-2" />
              Prosperity Program
            </TabsTrigger>
          </TabsList>

          {/* CLIENT PROFILES */}
          <TabsContent value="clients">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <CardTitle>📥 Bulk Import Client Profiles</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Alert className="bg-orange-50 border-orange-300">
                  <AlertDescription className="text-orange-900">
                    <strong>💡 Tip:</strong> Import multiple client profiles at once. Make sure all required fields are filled in the template.
                  </AlertDescription>
                </Alert>

                <div className="p-4 bg-orange-50 rounded-lg">
                  <Button onClick={() => downloadTemplate('clients')} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download Client Profile Template
                  </Button>
                  <p className="text-xs text-gray-600 mt-2">
                    Required: full_name, email<br/>
                    Optional: phone, age, gender, height, weight, target_weight, goal, food_preference, regional_preference, notes<br/>
                    Gender: male, female, other<br/>
                    Goal: weight_loss, weight_gain, maintenance, muscle_gain, health_improvement, disease_reversal<br/>
                    Food preference: veg, non_veg, eggetarian, jain, mixed<br/>
                    Regional preference: north, south, west, east, all
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="w-full p-2 border rounded-lg mb-3"
                  />
                  <Button
                    onClick={() => handleImport('clients')}
                    disabled={!file || importing}
                    className="bg-gradient-to-r from-green-500 to-emerald-500"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {importing ? 'Importing...' : 'Import Client Profiles'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* HEALTH COACH TRAINING */}
          <TabsContent value="coach">
            <div className="space-y-6">
              {/* Import Leads */}
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                  <CardTitle>📥 Import Coach Training Leads</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <Button onClick={() => downloadTemplate('leads', 'health_coach_training')} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download Leads Template
                    </Button>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="w-full p-2 border rounded-lg mb-3"
                    />
                    <Button
                      onClick={() => handleImport('leads', 'health_coach_training')}
                      disabled={!file || importing}
                      className="bg-gradient-to-r from-green-500 to-emerald-500"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {importing ? 'Importing...' : 'Import Leads'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Import Webinar */}
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                  <CardTitle>📥 Import Webinar Registrations</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <Button onClick={() => downloadTemplate('webinar', 'health_coach_training')} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download Webinar Template
                    </Button>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="w-full p-2 border rounded-lg mb-3"
                    />
                    <Button
                      onClick={() => handleImport('webinar', 'health_coach_training')}
                      disabled={!file || importing}
                      className="bg-gradient-to-r from-green-500 to-emerald-500"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {importing ? 'Importing...' : 'Import Webinar Registrations'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Import Showcases */}
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                  <CardTitle>📥 Import Showcase Registrations (Diploma/Diamond)</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <Button onClick={() => downloadTemplate('showcase', 'health_coach_training')} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download Showcase Template
                    </Button>
                    <p className="text-xs text-gray-600 mt-2">
                      Showcase types: diploma_showcase, diamond_showcase<br/>
                      Came from: silver_buyer, diploma_buyer, outside_lead
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="w-full p-2 border rounded-lg mb-3"
                    />
                    <Button
                      onClick={() => handleImport('showcase', 'health_coach_training')}
                      disabled={!file || importing}
                      className="bg-gradient-to-r from-green-500 to-emerald-500"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {importing ? 'Importing...' : 'Import Showcase Registrations'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* HEALTH/DISEASE MANAGEMENT */}
          <TabsContent value="health">
            <div className="space-y-6">
              {/* Import 1-2-1 Leads */}
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                  <CardTitle>📥 Import 1-2-1 Health Consultation Leads</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-700 mb-3">
                      Import individual consultation leads from Google, Social Media, or Referrals
                    </p>
                    <Button onClick={() => downloadTemplate('leads', 'health_disease_management')} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download 1-2-1 Leads Template
                    </Button>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="w-full p-2 border rounded-lg mb-3"
                    />
                    <Button
                      onClick={() => handleImport('leads', 'health_disease_management')}
                      disabled={!file || importing}
                      className="bg-gradient-to-r from-green-500 to-emerald-500"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {importing ? 'Importing...' : 'Import 1-2-1 Leads'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Import Challenge Leads */}
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                  <CardTitle>📥 Import 3-7 Days Challenge Registrations</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-700 mb-3">
                      Import leads who registered for 3-7 days health challenge (1-2-Many model)
                    </p>
                    <Button onClick={() => downloadTemplate('challenge', 'health_disease_management')} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download Challenge Template
                    </Button>
                    <p className="text-xs text-gray-600 mt-2">
                      Challenge type: 3_7_days_health
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="w-full p-2 border rounded-lg mb-3"
                    />
                    <Button
                      onClick={() => handleImport('challenge', 'health_disease_management')}
                      disabled={!file || importing}
                      className="bg-gradient-to-r from-green-500 to-emerald-500"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {importing ? 'Importing...' : 'Import Challenge Registrations'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PROSPERITY PROGRAM */}
          <TabsContent value="prosperity">
            <div className="space-y-6">
              {/* Import Prosperity Leads */}
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  <CardTitle>📥 Import Prosperity Program Leads</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-700 mb-3">
                      Import leads from existing clients, health coach students, or Archit's community
                    </p>
                    <Button onClick={() => downloadTemplate('leads', 'prosperity_program')} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download Prosperity Leads Template
                    </Button>
                    <p className="text-xs text-gray-600 mt-2">
                      Lead sources: existing_client, health_coach_student, archit_community
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="w-full p-2 border rounded-lg mb-3"
                    />
                    <Button
                      onClick={() => handleImport('leads', 'prosperity_program')}
                      disabled={!file || importing}
                      className="bg-gradient-to-r from-green-500 to-emerald-500"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {importing ? 'Importing...' : 'Import Prosperity Leads'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Import 5 Days Challenge */}
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                  <CardTitle>📥 Import 5 Days Prosperity Challenge</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-gray-700 mb-3">
                      Import registrations for 5 Days Prosperity Challenge
                    </p>
                    <Button onClick={() => downloadTemplate('challenge', 'prosperity_program')} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download Challenge Template
                    </Button>
                    <p className="text-xs text-gray-600 mt-2">
                      Challenge type: 5_days_prosperity
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="w-full p-2 border rounded-lg mb-3"
                    />
                    <Button
                      onClick={() => handleImport('challenge', 'prosperity_program')}
                      disabled={!file || importing}
                      className="bg-gradient-to-r from-green-500 to-emerald-500"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {importing ? 'Importing...' : 'Import Challenge Registrations'}
                    </Button>
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
              <li>Date format should be: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS</li>
              <li>For Clients: Email is required and must be unique</li>
              <li>For Clients: Height in cm, Weight in kg</li>
              <li>For Showcases: came_from options are silver_buyer, diploma_buyer, outside_lead</li>
              <li>For Challenges: challenge_type is 3_7_days_health or 5_days_prosperity</li>
              <li>Maximum 1000 records per import</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}