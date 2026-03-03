import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, Copy, Download, FileDown, FileText, Table } from "lucide-react";
import { jsPDF } from "jspdf";
import * as XLSX from 'xlsx';

export default function TemplateCard({ template, selectedClient, user, onAssign, onCustomize }) {
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  const handleDownloadPDF = async (template) => {
    try {
      const doc = new jsPDF();
      let yPos = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      // Title
      doc.setFontSize(20);
      doc.setTextColor(31, 41, 55);
      doc.text(template.name, margin, yPos);
      yPos += 10;

      // Line separator
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Template Details
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      if (template.description) {
        const descLines = doc.splitTextToSize(template.description || '', contentWidth);
        doc.text(descLines, margin, yPos);
        yPos += descLines.length * 5 + 5;
      }

      // Info section
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      const details = [
        [`Category:`, template.category?.replace(/_/g, ' ') || 'N/A'],
        [`Food Preference:`, template.food_preference || 'N/A'],
        [`Region:`, template.regional_preference || 'N/A'],
        [`Duration:`, `${template.duration || 0} days`],
        [`Calories:`, `${template.target_calories || 0} kcal`],
        [`Times Used:`, `${template.times_used || 0}x`],
      ];

      details.forEach((detail) => {
        doc.text(`${detail[0]}`, margin, yPos);
        doc.text(`${detail[1]}`, margin + 50, yPos);
        yPos += 6;
      });

      yPos += 10;

      // Meals section
      if (template.meals && template.meals.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(31, 41, 55);
        doc.text("Meal Plan Details", margin, yPos);
        yPos += 8;

        // Group meals by day
        const mealsByDay = {};
        template.meals.forEach(meal => {
          if (!mealsByDay[meal.day]) {
            mealsByDay[meal.day] = [];
          }
          mealsByDay[meal.day].push(meal);
        });

        // Render meals day by day
        Object.keys(mealsByDay).sort((a, b) => parseInt(a) - parseInt(b)).forEach(day => {
          // Check if we need a new page
          if (yPos > pageHeight - 60) {
            doc.addPage();
            yPos = 15;
          }

          doc.setFontSize(12);
          doc.setTextColor(31, 41, 55);
          doc.text(`Day ${day}`, margin, yPos);
          yPos += 7;

          mealsByDay[day].forEach(meal => {
            if (yPos > pageHeight - 40) {
              doc.addPage();
              yPos = 15;
            }

            doc.setFontSize(10);
            doc.setTextColor(50, 50, 50);
            doc.text(`• ${meal.meal_type?.replace(/_/g, ' ')}: ${meal.meal_name}`, margin + 5, yPos);
            yPos += 5;
            
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`  ${meal.calories || 0} kcal | P: ${meal.protein || 0}g | C: ${meal.carbs || 0}g | F: ${meal.fats || 0}g`, margin + 7, yPos);
            yPos += 6;
          });

          yPos += 3;
        });
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, margin, pageHeight - 10);

      doc.save(`${template.name}.pdf`);
      setDownloadMenuOpen(false);
    } catch (error) {
      console.error('PDF download error:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleDownloadExcel = (template) => {
    try {
      // Create metadata sheet
      const metadataSheet = XLSX.utils.json_to_sheet([{
        'Template Name': template.name,
        'Description': template.description || '',
        'Category': template.category || '',
        'Duration (Days)': template.duration || 0,
        'Target Calories': template.target_calories || 0,
        'Food Preference': template.food_preference || '',
        'Regional Preference': template.regional_preference || '',
        'Times Used': template.times_used || 0
      }]);

      // Create meals sheet
      const mealsData = (template.meals || []).map(meal => ({
        'Day': meal.day,
        'Meal Type': meal.meal_type,
        'Meal Name': meal.meal_name,
        'Items': meal.items?.join(' | ') || '',
        'Portion Sizes': meal.portion_sizes?.join(' | ') || '',
        'Calories': meal.calories || 0,
        'Protein (g)': meal.protein || 0,
        'Carbs (g)': meal.carbs || 0,
        'Fats (g)': meal.fats || 0,
        'Nutritional Tip': meal.nutritional_tip || ''
      }));
      const mealsSheet = XLSX.utils.json_to_sheet(mealsData);

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Template Info');
      XLSX.utils.book_append_sheet(workbook, mealsSheet, 'Meals');

      // Download
      XLSX.writeFile(workbook, `${template.name}.xlsx`);
      setDownloadMenuOpen(false);
    } catch (error) {
      console.error('Excel download error:', error);
      alert('Failed to generate Excel. Please try again.');
    }
  };

  const handleDownloadWord = (template) => {
    try {
      let content = `MEAL PLAN TEMPLATE\n`;
      content += `=====================================\n\n`;
      content += `Template Name: ${template.name}\n`;
      content += `Description: ${template.description || ''}\n`;
      content += `Category: ${template.category || ''}\n`;
      content += `Duration: ${template.duration || 0} days\n`;
      content += `Target Calories: ${template.target_calories || 0} kcal\n`;
      content += `Food Preference: ${template.food_preference || ''}\n`;
      content += `Regional Preference: ${template.regional_preference || ''}\n`;
      content += `Times Used: ${template.times_used || 0}\n\n`;
      content += `=====================================\n\n`;
      content += `MEALS:\n\n`;

      // Group meals by day
      const mealsByDay = {};
      (template.meals || []).forEach(meal => {
        if (!mealsByDay[meal.day]) {
          mealsByDay[meal.day] = [];
        }
        mealsByDay[meal.day].push(meal);
      });

      Object.keys(mealsByDay).sort((a, b) => parseInt(a) - parseInt(b)).forEach(day => {
        content += `DAY ${day}:\n`;
        content += `----------\n`;
        
        mealsByDay[day].forEach((meal, index) => {
          content += `${index + 1}. ${meal.meal_type?.replace(/_/g, ' ').toUpperCase()}: ${meal.meal_name}\n`;
          content += `   Items: ${meal.items?.join(' | ') || ''}\n`;
          content += `   Portions: ${meal.portion_sizes?.join(' | ') || ''}\n`;
          content += `   Nutrition: ${meal.calories || 0} kcal | P: ${meal.protein || 0}g | C: ${meal.carbs || 0}g | F: ${meal.fats || 0}g\n`;
          content += `   Tip: ${meal.nutritional_tip || ''}\n\n`;
        });
        
        content += `\n`;
      });

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloadMenuOpen(false);
    } catch (error) {
      console.error('Word download error:', error);
      alert('Failed to generate Word file. Please try again.');
    }
  };

  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all">
      <CardHeader className="p-4 lg:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm lg:text-lg truncate">{template.name}</CardTitle>
            <p className="text-xs lg:text-sm text-gray-600 mt-1 line-clamp-2">{template.description}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {template.is_public && (
              <Badge className="bg-purple-100 text-purple-700 text-xs">Public</Badge>
            )}
            {template.created_by === user?.email && (
              <Badge className="bg-blue-100 text-blue-700 text-xs">Mine</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 lg:p-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-orange-100 text-orange-700 capitalize text-xs">
            {template.food_preference}
          </Badge>
          <Badge className="bg-blue-100 text-blue-700 text-xs">
            {template.target_calories} kcal
          </Badge>
          <Badge className="bg-green-100 text-green-700 text-xs">
            {template.duration}d
          </Badge>
        </div>

        <div className="p-2 lg:p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs lg:text-sm font-semibold text-green-900">
            ✅ Used {template.times_used || 0}x
          </p>
          <p className="text-xs text-green-700">FREE!</p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => onAssign(template)}
            disabled={!selectedClient}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs h-9"
            title={!selectedClient ? "Please select a client first" : "Assign template directly to client"}
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Assign Now
          </Button>
          <Button
            onClick={() => onCustomize(template)}
            disabled={!selectedClient}
            variant="outline"
            className="w-full disabled:opacity-50 disabled:cursor-not-allowed text-xs h-9"
            title={!selectedClient ? "Please select a client first" : "Customize template before assigning"}
          >
            <Copy className="w-3 h-3 mr-1" />
            Customize
          </Button>
          
          {/* Download Button with Format Selection */}
          <Dialog open={downloadMenuOpen} onOpenChange={setDownloadMenuOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full border-green-500 text-green-700 hover:bg-green-50 text-xs h-9"
              >
                <Download className="w-3 h-3 mr-1" />
                Download File
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xs">
              <DialogHeader>
                <DialogTitle>Choose Format</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <Button
                  onClick={() => handleDownloadPDF(template)}
                  className="w-full h-12 bg-red-500 hover:bg-red-600"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  PDF File
                </Button>
                <Button
                  onClick={() => handleDownloadExcel(template)}
                  className="w-full h-12 bg-green-500 hover:bg-green-600"
                >
                  <Table className="w-4 h-4 mr-2" />
                  Excel File
                </Button>
                <Button
                  onClick={() => handleDownloadWord(template)}
                  className="w-full h-12 bg-blue-500 hover:bg-blue-600"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Word/Text File
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}