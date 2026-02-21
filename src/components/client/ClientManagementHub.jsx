import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, FileText, BarChart3, ClipboardList } from "lucide-react";

// Lazy-load the heavy pages as components
import ClientProgressReview from "@/pages/ClientProgressReview";
import ClientReports from "@/pages/ClientReports";
import ClientAnalyticsDashboard from "@/pages/ClientAnalyticsDashboard";
import CoachReportTracker from "@/pages/CoachReportTracker";

export default function ClientManagementHub({ ClientListComponent }) {
  const [activeTab, setActiveTab] = useState("clients");

  return (
    <div className="min-h-screen">
      {/* Tab Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex h-auto overflow-x-auto bg-transparent gap-0 border-0 rounded-none w-full justify-start">
              <TabsTrigger
                value="clients"
                className="flex items-center gap-1.5 px-3 sm:px-5 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:bg-orange-50 text-gray-600 font-semibold text-xs sm:text-sm whitespace-nowrap"
              >
                <Users className="w-4 h-4" />
                <span>Clients</span>
              </TabsTrigger>
              <TabsTrigger
                value="progress"
                className="flex items-center gap-1.5 px-3 sm:px-5 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:bg-orange-50 text-gray-600 font-semibold text-xs sm:text-sm whitespace-nowrap"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Progress Review</span>
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="flex items-center gap-1.5 px-3 sm:px-5 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:bg-orange-50 text-gray-600 font-semibold text-xs sm:text-sm whitespace-nowrap"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="flex items-center gap-1.5 px-3 sm:px-5 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:bg-orange-50 text-gray-600 font-semibold text-xs sm:text-sm whitespace-nowrap"
              >
                <FileText className="w-4 h-4" />
                <span>Reports</span>
              </TabsTrigger>
              <TabsTrigger
                value="clinical"
                className="flex items-center gap-1.5 px-3 sm:px-5 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:bg-orange-50 text-gray-600 font-semibold text-xs sm:text-sm whitespace-nowrap"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Clinical Reports</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clients" className="mt-0">
              <ClientListComponent />
            </TabsContent>

            <TabsContent value="progress" className="mt-0">
              <ClientProgressReview />
            </TabsContent>

            <TabsContent value="analytics" className="mt-0">
              <ClientAnalyticsDashboard />
            </TabsContent>

            <TabsContent value="reports" className="mt-0">
              <ClientReports />
            </TabsContent>

            <TabsContent value="clinical" className="mt-0">
              <CoachReportTracker />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}