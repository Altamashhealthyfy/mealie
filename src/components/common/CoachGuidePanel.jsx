import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, Users, ChefHat, Calendar, MessageSquare, 
  TrendingUp, FileText, Lightbulb, CheckCircle, Zap 
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CoachGuidePanel() {
  const guides = [
    {
      icon: Users,
      title: "Manage Clients",
      description: "Add clients, assign them to team members, and track their profiles",
      color: "from-blue-500 to-cyan-500",
      link: createPageUrl("ClientManagement"),
      tips: ["Add client details", "Assign to team", "Track contact info"]
    },
    {
      icon: ChefHat,
      title: "Create Meal Plans",
      description: "Generate personalized nutrition plans for your clients",
      color: "from-orange-500 to-red-500",
      link: createPageUrl("MealPlanner"),
      tips: ["Use AI generation", "Customize meals", "Set macro targets"]
    },
    {
      icon: TrendingUp,
      title: "Monitor Analytics",
      description: "Track client progress, engagement, and key metrics",
      color: "from-purple-500 to-pink-500",
      link: createPageUrl("ClientAnalyticsDashboard"),
      tips: ["Review trends", "Identify inactive clients", "Measure success"]
    },
    {
      icon: FileText,
      title: "Assessment Templates",
      description: "Create custom intake forms and questionnaires",
      color: "from-green-500 to-emerald-500",
      link: createPageUrl("AssessmentTemplates"),
      tips: ["Build custom forms", "Add conditional logic", "Reuse templates"]
    },
    {
      icon: MessageSquare,
      title: "Client Communication",
      description: "Message clients via email or in-app chat",
      color: "from-cyan-500 to-blue-500",
      link: createPageUrl("Communication"),
      tips: ["Send bulk messages", "Use templates", "Track conversations"]
    },
  ];

  const bestPractices = [
    "Review client progress at least once per week",
    "Respond to client messages within 24 hours",
    "Update meal plans based on progress feedback",
    "Schedule regular check-in appointments",
    "Use analytics to identify at-risk clients",
  ];

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-600" />
          Health Coach Quick Guide
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-orange-50 border-orange-300">
          <Zap className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-sm">
            <strong>Welcome, Coach!</strong> Use these tools to deliver exceptional client care.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {guides.map((guide, idx) => (
            <div key={idx} className="p-4 bg-white rounded-lg border-2 border-gray-100 hover:border-indigo-300 transition-all">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${guide.color} flex items-center justify-center shrink-0`}>
                  <guide.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{guide.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{guide.description}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {guide.tips.map((tip, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tip}
                      </Badge>
                    ))}
                  </div>
                  <Link to={guide.link}>
                    <Button size="sm" variant="ghost" className="text-indigo-600 hover:bg-indigo-50 p-0">
                      Open →
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-white rounded-lg border-2 border-indigo-300">
          <div className="flex items-start gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <h3 className="font-semibold text-indigo-900">Best Practices</h3>
          </div>
          <ul className="space-y-2">
            {bestPractices.map((practice, idx) => (
              <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-indigo-600 shrink-0">•</span>
                <span>{practice}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}