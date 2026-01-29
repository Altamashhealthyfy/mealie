import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Users, Loader2, AlertCircle, LogIn, UserPlus } from "lucide-react";

export default function PublicPlanPurchase() {
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const planId = urlParams.get('planId');

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ['publicClientPlan', planId],
    queryFn: async () => {
      const plans = await base44.asServiceRole.entities.ClientPlanDefinition.filter({ 
        id: planId, 
        status: 'active' 
      });
      return plans[0] || null;
    },
    enabled: !!planId,
  });

  const { data: coachProfile } = useQuery({
    queryKey: ['coachProfile', plan?.coach_email],
    queryFn: async () => {
      const profiles = await base44.asServiceRole.entities.CoachProfile.filter({ 
        created_by: plan?.coach_email 
      });
      return profiles[0] || null;
    },
    enabled: !!plan?.coach_email,
  });

  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: async () => {
      try {
        await base44.auth.me();
        return true;
      } catch {
        return false;
      }
    },
  });

  const handleLogin = () => {
    const redirectUrl = window.location.href;
    base44.auth.redirectToLogin(redirectUrl);
  };

  const handleProceedToPurchase = () => {
    window.location.href = `/#/purchase-client-plan?planId=${planId}`;
  };

  if (!planId) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
        <Alert className="max-w-md border-red-500 bg-red-50">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <AlertDescription className="text-red-900">
            Invalid purchase link. Plan ID is missing.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (planLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
        <Alert className="max-w-md border-orange-500 bg-orange-50">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          <AlertDescription className="text-orange-900">
            Plan not found or inactive. Please check the link and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const brandingName = coachProfile?.custom_branding_name || coachProfile?.business_name || 'Health Coach';
  const brandingLogo = coachProfile?.logo_url;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {brandingLogo ? (
              <img src={brandingLogo} alt={brandingName} className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h2 className="font-bold text-gray-900">{brandingName}</h2>
              <p className="text-xs text-gray-600">Health & Wellness</p>
            </div>
          </div>
          
          {!isAuthenticated && (
            <Button onClick={handleLogin} variant="outline" size="sm">
              <LogIn className="w-4 h-4 mr-2" />
              Login
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 md:p-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {plan.plan_name}
          </h1>
          <p className="text-xl text-gray-600">
            Transform your health with our {plan.duration_days}-day personalized program
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Plan Details */}
          <Card className="border-none shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-10 h-10" />
                <Badge className="bg-white text-blue-600 text-sm px-3 py-1">
                  {plan.duration_days} DAYS
                </Badge>
              </div>
              <CardTitle className="text-3xl mb-3">{plan.plan_name}</CardTitle>
              <div className="mt-4">
                <p className="text-5xl font-bold">₹{plan.price}</p>
                <p className="text-sm opacity-90 mt-1">Complete {plan.duration_days}-day program</p>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {plan.plan_description && (
                <div>
                  <p className="text-gray-700 leading-relaxed">{plan.plan_description}</p>
                </div>
              )}

              {plan.health_focus?.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-3">🎯 Health Focus:</p>
                  <div className="flex flex-wrap gap-2">
                    {plan.health_focus.map((focus, idx) => (
                      <Badge key={idx} variant="outline" className="text-sm px-3 py-1">
                        {focus}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {plan.features?.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-3">✨ What's Included:</p>
                  <div className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                          <Check className="w-3 h-3 text-green-600" />
                        </div>
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Purchase CTA */}
          <div className="space-y-6">
            <Card className="border-none shadow-2xl sticky top-8">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                <CardTitle className="text-2xl">🎉 Ready to Start Your Journey?</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="font-semibold text-gray-900">Program Price:</span>
                    <span className="text-2xl font-bold text-gray-900">₹{plan.price}</span>
                  </div>

                  <Alert className="bg-blue-50 border-blue-300">
                    <AlertDescription className="text-blue-900 text-sm">
                      💳 Secure payment via Razorpay • 100% Safe & Encrypted
                    </AlertDescription>
                  </Alert>
                </div>

                {isAuthenticated ? (
                  <Button
                    onClick={handleProceedToPurchase}
                    className="w-full h-14 text-lg bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 shadow-lg"
                  >
                    Proceed to Secure Checkout
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Button
                      onClick={handleLogin}
                      className="w-full h-14 text-lg bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 shadow-lg"
                    >
                      <LogIn className="w-5 h-5 mr-2" />
                      Login to Purchase
                    </Button>
                    <p className="text-center text-sm text-gray-600">
                      Don't have an account? Contact your health coach to get started.
                    </p>
                  </div>
                )}

                <div className="pt-6 border-t space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Personalized meal plans</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Expert guidance & support</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Progress tracking tools</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <p className="text-sm text-gray-600 text-center">
                  By purchasing this plan, you agree to work with {brandingName} to achieve your health goals.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm opacity-75">
            Powered by {brandingName} • Secure Payment Processing
          </p>
        </div>
      </div>
    </div>
  );
}