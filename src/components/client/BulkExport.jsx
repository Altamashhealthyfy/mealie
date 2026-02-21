import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function BulkExport({ clients, open, onOpenChange }) {
  const [selectedColumns, setSelectedColumns] = useState({
    full_name: true,
    email: true,
    phone: true,
    status: true,
    goal: true,
    food_preference: true,
    age: true,
    weight: true,
    target_weight: true,
    target_calories: true,
    join_date: true,
  });
  const [isExporting, setIsExporting] = useState(false);

  const columnLabels = {
    full_name: "Full Name",
    email: "Email",
    phone: "Phone",
    status: "Status",
    goal: "Goal",
    food_preference: "Food Preference",
    age: "Age",
    weight: "Current Weight (kg)",
    target_weight: "Target Weight (kg)",
    target_calories: "Target Calories",
    join_date: "Join Date",
  };

  const toggleColumn = (column) => {
    setSelectedColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const selectAll = () => {
    const allSelected = Object.values(selectedColumns).every(v => v);
    const newState = {};
    Object.keys(selectedColumns).forEach(key => {
      newState[key] = !allSelected;
    });
    setSelectedColumns(newState);
  };

  const exportToCSV = async () => {
    if (clients.length === 0) {
      toast.error("No clients to export");
      return;
    }

    const selectedCols = Object.keys(selectedColumns).filter(col => selectedColumns[col]);
    if (selectedCols.length === 0) {
      toast.error("Please select at least one column");
      return;
    }

    setIsExporting(true);
    try {
      // Create CSV header
      const headers = selectedCols.map(col => columnLabels[col]);
      
      // Create CSV rows
      const rows = clients.map(client => {
        return selectedCols.map(col => {
          let value = client[col] || "";
          
          // Format specific fields
          if (col === "join_date" && value) {
            value = new Date(value).toLocaleDateString('en-IN');
          } else if (col === "goal" || col === "food_preference") {
            value = (value || "").replace(/_/g, " ");
          }
          
          // Escape quotes in CSV
          if (typeof value === "string" && value.includes('"')) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          
          return value;
        }).join(",");
      });

      // Combine header and rows
      const csv = [headers.join(","), ...rows].join("\n");
      
      // Create blob and download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `clients_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${clients.length} client(s) successfully`);
      onOpenChange(false);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export clients");
    } finally {
      setIsExporting(false);
    }
  };

  const selectedCount = Object.values(selectedColumns).filter(v => v).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-orange-600" />
            Export Clients as CSV
          </DialogTitle>
          <DialogDescription>
            Select which columns to include in your export
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="bg-blue-50 border-blue-300">
            <AlertDescription className="text-sm text-blue-900">
              📊 Exporting {clients.length} client{clients.length !== 1 ? 's' : ''}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-gray-700">Columns</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="text-xs text-orange-600 hover:bg-orange-50"
              >
                {Object.values(selectedColumns).every(v => v) ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2 border rounded-lg bg-gray-50">
              {Object.entries(columnLabels).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`column-${key}`}
                    checked={selectedColumns[key]}
                    onCheckedChange={() => toggleColumn(key)}
                  />
                  <Label
                    htmlFor={`column-${key}`}
                    className="text-sm cursor-pointer"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500">
              {selectedCount} column{selectedCount !== 1 ? 's' : ''} selected
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={exportToCSV}
              disabled={isExporting || selectedCount === 0}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}