import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, X, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function BulkClientImport({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [csvContent, setCsvContent] = useState("");
  const [csvError, setCsvError] = useState("");
  const [manualRows, setManualRows] = useState([
    { full_name: "", email: "", phone: "" },
    { full_name: "", email: "", phone: "" },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  const createClientsMutation = useMutation({
    mutationFn: async (clients) => {
      const results = [];
      for (const client of clients) {
        const newClient = await base44.entities.Client.create({
          full_name: client.full_name,
          email: client.email,
          phone: client.phone || null,
          status: "active",
          join_date: format(new Date(), "yyyy-MM-dd"),
        });
        results.push(newClient);

        // Send welcome email
        try {
          await base44.functions.invoke("sendGoogleWorkspaceEmail", {
            to: newClient.email,
            subject: "Welcome to Mealie Pro!",
            body: `Hi ${newClient.full_name},\n\nWelcome to Mealie Pro! Your health journey starts today.\n\nAccess your dashboard: https://mealiepro.com\n\nTeam Mealie Pro`,
          });
        } catch (error) {
          console.error("Email send failed:", error);
        }
      }
      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["clients"]);
      toast.success(`✅ ${data.length} client(s) added successfully!`);
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`❌ Error: ${error.message}`);
    },
  });

  const downloadSampleCSV = () => {
    const sampleData = `Full Name,Email,Phone
John Doe,john@example.com,9876543210
Jane Smith,jane@example.com,9876543211
Bob Johnson,bob@example.com,9876543212`;

    const blob = new Blob([sampleData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_clients.csv";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const parseCSV = (content) => {
    setCsvError("");
    const lines = content.trim().split("\n");
    if (lines.length < 2) {
      setCsvError("CSV must contain header row and at least one data row");
      return null;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const fullNameIndex = headers.indexOf("full name");
    const emailIndex = headers.indexOf("email");
    const phoneIndex = headers.indexOf("phone");

    if (fullNameIndex === -1 || emailIndex === -1) {
      setCsvError("CSV must contain 'Full Name' and 'Email' columns");
      return null;
    }

    const clients = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length > emailIndex && values[fullNameIndex] && values[emailIndex]) {
        clients.push({
          full_name: values[fullNameIndex],
          email: values[emailIndex],
          phone: phoneIndex !== -1 ? values[phoneIndex] : "",
        });
      }
    }

    if (clients.length === 0) {
      setCsvError("No valid rows found in CSV");
      return null;
    }

    return clients;
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target?.result || "");
    };
    reader.readAsText(file);
  };

  const handleCSVImport = async () => {
    const clients = parseCSV(csvContent);
    if (!clients || clients.length === 0) return;

    setIsProcessing(true);
    try {
      await createClientsMutation.mutateAsync(clients);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualImport = async () => {
    const validRows = manualRows.filter((row) => row.full_name.trim() && row.email.trim());
    if (validRows.length === 0) {
      toast.error("Please fill in at least one client's name and email");
      return;
    }

    setIsProcessing(true);
    try {
      await createClientsMutation.mutateAsync(validRows);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setCsvContent("");
    setCsvError("");
    setManualRows([
      { full_name: "", email: "", phone: "" },
      { full_name: "", email: "", phone: "" },
    ]);
  };

  const updateManualRow = (index, field, value) => {
    const updated = [...manualRows];
    updated[index][field] = value;
    setManualRows(updated);
  };

  const addManualRow = () => {
    setManualRows([...manualRows, { full_name: "", email: "", phone: "" }]);
  };

  const removeManualRow = (index) => {
    if (manualRows.length > 1) {
      setManualRows(manualRows.filter((_, i) => i !== index));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Plus className="w-6 h-6" />
            Add Clients in Bulk
          </DialogTitle>
          <DialogDescription>
            Import multiple clients at once using CSV or manual entry
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="csv" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="csv">Import CSV</TabsTrigger>
            <TabsTrigger value="manual">Add Manually</TabsTrigger>
          </TabsList>

          {/* CSV Import Tab */}
          <TabsContent value="csv" className="space-y-4 mt-4">
            <Alert className="bg-blue-50 border-blue-300">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                Import clients using a CSV file. Must contain "Full Name", "Email", and optionally "Phone" columns.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Download Sample CSV
                </label>
                <Button
                  variant="outline"
                  onClick={downloadSampleCSV}
                  className="w-full text-blue-600 hover:bg-blue-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Sample CSV
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-orange-50 file:text-orange-700
                    hover:file:bg-orange-100"
                />
              </div>

              {csvContent && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    ✅ CSV loaded ({csvContent.split("\n").length - 1} rows)
                  </p>
                  {csvError && (
                    <Alert className="bg-red-50 border-red-300">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-sm text-red-900">
                        {csvError}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <Button
                onClick={handleCSVImport}
                disabled={!csvContent || isProcessing || createClientsMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isProcessing || createClientsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Import CSV
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Manual Entry Tab */}
          <TabsContent value="manual" className="space-y-4 mt-4">
            <Alert className="bg-blue-50 border-blue-300">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                Add clients manually. Fill in at least one row to import.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {manualRows.map((row, index) => (
                <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      placeholder="Full Name (e.g., John Doe)"
                      value={row.full_name}
                      onChange={(e) => updateManualRow(index, "full_name", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="email"
                      placeholder="Email (e.g., john@example.com)"
                      value={row.email}
                      onChange={(e) => updateManualRow(index, "email", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (optional, e.g., 9876543210)"
                      value={row.phone}
                      onChange={(e) => updateManualRow(index, "phone", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  {manualRows.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeManualRow(index)}
                      className="text-red-600 hover:bg-red-50 mt-6"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={addManualRow}
              className="w-full text-orange-600 hover:bg-orange-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another
            </Button>

            <Button
              onClick={handleManualImport}
              disabled={isProcessing || createClientsMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isProcessing || createClientsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Import Clients
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}