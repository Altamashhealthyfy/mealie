import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, ChefHat, Scale, Heart, MessageCircle, 
  Calendar, CheckCircle, TrendingUp, Lightbulb 
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClientGuidePanel() {
  const guides = [
    {
      icon: ChefHat,
      title: "Track Your Meals",
      description: "Log your daily food intake to stay on track with your nutrition plan",
      color: "from-orange-500 to-red-500",
      link: createPageUrl("FoodLog"),
      tips: ["Take photos of meals", "Record portion sizes", "Note how you feel after eating"]
    },
    {
      icon: Scale,
      title: "Monitor Progress",
      description: "Track weight, measurements, and wellness metrics regularly",
      color: "from-blue-500 to-cyan-500",
      link: createPageUrl("ProgressTracking"),
      tips: ["Weigh yourself weekly", "Take progress photos", "Log your energy levels"]
    },
    {
      icon: Heart,
      title: "MPESS Wellness",
      description: "Complete daily wellness practices for holistic health",
      color: "from-pink-500 to-rose-500",
      link: createPageUrl("MPESSTracker"),
      tips: ["Practice mindfulness", "Stay hydrated", "Connect with loved ones"]
    },
    {
      icon: MessageCircle,
      title: "Stay Connected",
      description: "Message your coach anytime with questions or concerns",
      color: "from-green-500 to-emerald-500",
      link: createPageUrl("ClientCommunication"),
      tips: ["Ask questions", "Share challenges", "Celebrate wins"]
    },
  ];

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-purple-600" />
          Quick Start Guide
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-300">
          <Lightbulb className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-sm">
            <strong>New here?</strong> Follow these steps to get the most out of your health journey!
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {guides.map((guide, idx) => (
            <div key={idx} className="p-4 bg-white rounded-lg border-2 border-gray-100 hover:border-purple-300 transition-all">
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
                    <Button size="sm" variant="ghost" className="text-purple-600 hover:bg-purple-50 p-0">
                      Get Started →
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-300">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900 mb-1">Pro Tip</p>
              <p className="text-sm text-green-700">
                Consistency is key! Log your progress at least 2-3 times per week for best results.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}