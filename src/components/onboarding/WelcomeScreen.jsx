import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, Target, MessageCircle, TrendingUp, ChefHat, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function WelcomeScreen({ user, onStart }) {
  const highlights = [
    { icon: ChefHat, label: "Personalized Meal Plans", color: "bg-orange-100 text-orange-600" },
    { icon: TrendingUp, label: "Progress Tracking", color: "bg-blue-100 text-blue-600" },
    { icon: MessageCircle, label: "Direct Coach Chat", color: "bg-green-100 text-green-600" },
    { icon: Heart, label: "Holistic Wellness", color: "bg-pink-100 text-pink-600" },
    { icon: Target, label: "Goal Setting", color: "bg-purple-100 text-purple-600" },
    { icon: Sparkles, label: "AI-Powered Insights", color: "bg-amber-100 text-amber-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <ChefHat className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            Welcome{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}! 🎉
          </h1>
          <p className="text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
            You're about to start a personalized health journey guided by your very own coach. Let's set things up!
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-3"
        >
          {highlights.map((item) => (
            <div key={item.label} className="bg-white/80 backdrop-blur rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
            </div>
          ))}
        </motion.div>

        {/* What to expect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-sm text-left"
        >
          <h3 className="font-semibold text-gray-900 mb-3 text-center">What to expect in setup (~5 min)</h3>
          <div className="space-y-2">
            {[
              { step: "1", text: "Tell us about yourself & your health" },
              { step: "2", text: "Set your goals with AI guidance" },
              { step: "3", text: "Quick tour of your key features" },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {item.step}
                </div>
                <span className="text-gray-700">{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Button
            onClick={onStart}
            size="lg"
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-10 py-4 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            Let's Get Started <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-sm text-gray-500 mt-3">No credit card required · Cancel anytime</p>
        </motion.div>
      </div>
    </div>
  );
}