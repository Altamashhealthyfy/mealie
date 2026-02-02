import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, Users, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function BulkStudentOnboarding() {
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);

  const downloadTemplate = () => {
    const csvContent = 'email,full_name,plan_type\njohn@example.com,John Doe,Mealie Basic\njane@example.com,Jane Smith,Mealie Pro';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_onboarding_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = values[i];
      });
      return obj;
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProcessing(true);
    setResults(null);

    try {
      const text = await file.text();
      const students = parseCSV(text);

      const response = await base44.functions.invoke('bulkOnboardStudents', { students });
      
      setResults(response.data.results);
    } catch (error) {
      alert('Error processing file: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Bulk Student Onboarding</h1>
          <p className="text-gray-600">Upload a CSV file to onboard multiple students at once</p>
        </div>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Student List
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>CSV Format:</strong> The file must contain 3 columns: <code>email</code>, <code>full_name</code>, and <code>plan_type</code> (either "Mealie Basic" or "Mealie Pro")
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download CSV Template
              </Button>

              <div className="flex-1">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={processing}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button
                    asChild
                    disabled={processing}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    <span className="cursor-pointer flex items-center justify-center gap-2">
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload CSV File
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {results && (
          <div className="space-y-4">
            <Card className="border-none shadow-lg bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                  Successfully Onboarded ({results.success.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {results.success.length === 0 ? (
                  <p className="text-gray-600">No students were successfully onboarded.</p>
                ) : (
                  <div className="space-y-2">
                    {results.success.map((student, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{student.full_name}</p>
                          <p className="text-sm text-gray-600">{student.email}</p>
                        </div>
                        <div className="text-right">
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            {student.plan}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {results.failed.length > 0 && (
              <Card className="border-none shadow-lg bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <XCircle className="w-5 h-5" />
                    Failed ({results.failed.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {results.failed.map((student, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{student.email}</p>
                          <p className="text-sm text-red-600">{student.error}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Card className="border-none shadow-lg bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Users className="w-5 h-5" />
              What Happens Next?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-gray-700">
            <p>✅ Each student will receive an invitation email to set up their account</p>
            <p>✅ They will be assigned either Mealie Basic or Mealie Pro plan based on your CSV</p>
            <p>✅ Subscription is valid for 1 year from today</p>
            <p>✅ Students can start managing their clients immediately after accepting the invitation</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}