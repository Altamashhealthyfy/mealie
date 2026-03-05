import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";

export default function IntakeTemplateDownload({ clientName = "" }) {
  const handleDownload = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 18;
    let y = 18;

    const sectionTitle = (text) => {
      doc.setFillColor(243, 115, 22); // orange
      doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(text, margin + 3, y + 5.5);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      y += 12;
    };

    const field = (label, lines = 1) => {
      doc.setFontSize(9);
      doc.text(label + ":", margin, y);
      for (let i = 0; i < lines; i++) {
        doc.setDrawColor(180, 180, 180);
        doc.line(margin + 60, y, pageWidth - margin, y);
        y += 6;
      }
      y += 2;
    };

    const twoFields = (label1, label2) => {
      const mid = pageWidth / 2 + 2;
      doc.setFontSize(9);
      doc.text(label1 + ":", margin, y);
      doc.setDrawColor(180, 180, 180);
      doc.line(margin + 45, y, mid - 5, y);
      doc.text(label2 + ":", mid, y);
      doc.line(mid + 45, y, pageWidth - margin, y);
      y += 9;
    };

    // Header
    doc.setFillColor(243, 115, 22);
    doc.rect(0, 0, pageWidth, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENT CLINICAL INTAKE FORM", pageWidth / 2, 11, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Please fill all sections. This helps us create a personalised nutrition plan for you.", pageWidth / 2, 18, { align: "center" });
    doc.setTextColor(0, 0, 0);
    y = 30;

    // Client name & date
    twoFields("Client Name", "Date");
    if (clientName) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text(`(Pre-filled: ${clientName})`, margin, y - 3);
      doc.setFont("helvetica", "normal");
    }

    // 1. Basic Info
    sectionTitle("1. BASIC INFORMATION");
    twoFields("Age", "Gender (Male/Female/Other)");
    twoFields("Height (cm)", "Weight (kg)");
    field("Activity Level (Sedentary / Lightly Active / Moderately Active / Very Active)");

    // 2. Health Conditions
    sectionTitle("2. HEALTH CONDITIONS (Tick all that apply)");
    doc.setFontSize(9);
    const conditions = ["Diabetes", "Thyroid", "Liver", "Kidney", "Heart", "Hormonal", "Hypertension", "Others"];
    conditions.forEach((c, i) => {
      const col = i % 2 === 0 ? margin : pageWidth / 2;
      doc.rect(col, y - 4, 4, 4);
      doc.text(c, col + 6, y - 1);
      if (i % 2 === 1) y += 8;
    });
    y += 8;
    field("Stage / Severity (if known)", 1);

    // 3. Medications
    sectionTitle("3. CURRENT MEDICATIONS");
    doc.setFontSize(8);
    doc.text("Medicine Name", margin, y);
    doc.text("Dosage", margin + 65, y);
    doc.text("Frequency", margin + 110, y);
    y += 4;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 1;
    for (let i = 0; i < 5; i++) {
      y += 8;
      doc.line(margin, y, margin + 60, y);
      doc.line(margin + 65, y, margin + 105, y);
      doc.line(margin + 110, y, pageWidth - margin, y);
    }
    y += 5;

    // 4. Lab Values
    sectionTitle("4. RECENT LAB VALUES (attach report if available)");
    const labs = [
      ["TSH (mIU/L)", "HbA1c (%)"],
      ["Total Cholesterol", "LDL (mg/dL)"],
      ["HDL (mg/dL)", "Triglycerides"],
      ["SGOT (U/L)", "SGPT (U/L)"],
      ["Creatinine", "Vitamin D"],
      ["Vitamin B12", "Uric Acid"],
    ];
    labs.forEach(([l1, l2]) => twoFields(l1, l2));

    // 5. Diet Preferences
    sectionTitle("5. DIET PREFERENCES");
    field("Diet Type (Veg / Non-Veg / Vegan / Jain / Eggetarian)");
    field("Foods You Like (comma separated)", 2);
    field("Foods You Dislike", 2);
    field("Allergies / Intolerances", 2);
    field("No-Go Foods (absolute restrictions)", 1);

    // 6. Daily Routine
    sectionTitle("6. DAILY ROUTINE & MEAL TIMINGS");
    twoFields("Wake Up Time", "Breakfast Time");
    twoFields("Lunch Time", "Dinner Time");
    field("Sleep Time");

    // 7. Health Goals
    sectionTitle("7. HEALTH GOALS (Tick all that apply)");
    const goals = ["Weight Loss", "Maintenance", "Energy Improvement", "Symptom Relief", "Disease Reversal", "Muscle Gain"];
    goals.forEach((g, i) => {
      const col = i % 2 === 0 ? margin : pageWidth / 2;
      doc.rect(col, y - 4, 4, 4);
      doc.text(g, col + 6, y - 1);
      if (i % 2 === 1) y += 8;
    });
    y += 5;
    field("Specific Symptoms You Want Relief From", 3);

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text("This form is confidential. Your data will only be used to create your personalised nutrition plan.", pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });

    doc.save(`Client_Intake_Template${clientName ? "_" + clientName.replace(/\s+/g, "_") : ""}.pdf`);
  };

  return (
    <Button type="button" variant="outline" onClick={handleDownload} className="flex items-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50">
      <Download className="w-4 h-4" />
      Download Intake Template
    </Button>
  );
}