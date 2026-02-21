import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, FileText, BarChart3 } from "lucide-react";

// Lazy-load the heavy pages as components
import ClientProgressReview from "@/pages/ClientProgressReview";
import ClientReports from "@/pages/ClientReports";
import ClientAnalyticsDashboard from "@/pages/ClientAnalyticsDashboard";

export default function ClientManagementHub({ ClientListComponent }) {
  return (
    <div className="min-h-screen">
      <ClientListComponent />
    </div>
  );
}