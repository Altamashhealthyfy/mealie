import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import { 
  Globe, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Copy, 
  ExternalLink,
  AlertTriangle,
  Crown,
  Lock,
  RefreshCw
} from "lucide-react";

export default function CustomDomainSettings() {
  const [domain, setDomain] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: coachProfile } = useQuery({
    queryKey: ['coachProfile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.CoachProfile.filter({ created_by: user?.email });
      return profiles[0] || null;
    },
    enabled: !!user,
  });

  const { data: subscription } = useQuery({
    queryKey: ['coachSubscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.HealthCoachSubscription.filter({ 
        coach_email: user?.email,
        status: 'active'
      });
      return subs[0] || null;
    },
    enabled: !!user,
  });

  const { data: plan } = useQuery({
    queryKey: ['coachPlan', subscription?.plan_id],
    queryFn: async () => {
      if (!subscription?.plan_id) return null;
      const plans = await base44.entities.HealthCoachPlan.filter({ id: subscription.plan_id });
      return plans[0] || null;
    },
    enabled: !!subscription?.plan_id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      if (coachProfile) {
        return await base44.entities.CoachProfile.update(coachProfile.id, data);
      } else {
        return await base44.entities.CoachProfile.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coachProfile']);
    },
  });

  const handleAddDomain = async () => {
    if (!domain.trim()) {
      alert("Please enter a domain name");
      return;
    }

    // Basic domain validation
    const domainRegex = /^([a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      alert("❌ Invalid domain format. Example: coaching.mysite.com");
      return;
    }

    setIsAdding(true);
    
    // Generate verification code
    const verificationCode = `mealie-verify-${Math.random().toString(36).substring(2, 15)}`;

    try {
      await updateProfileMutation.mutateAsync({
        custom_domain: domain.toLowerCase().trim(),
        custom_domain_status: "pending_verification",
        domain_verification_code: verificationCode
      });

      alert("✅ Domain added! Follow the DNS instructions below to verify.");
      setDomain("");
    } catch (error) {
      console.error("Error adding domain:", error);
      alert("❌ Failed to add domain. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!window.confirm("Are you sure you want to remove this domain? Your clients won't be able to access via this domain anymore.")) {
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        custom_domain: null,
        custom_domain_status: "not_configured",
        domain_verification_code: null,
        domain_configured_date: null
      });
      alert("✅ Domain removed successfully");
    } catch (error) {
      console.error("Error removing domain:", error);
      alert("❌ Failed to remove domain");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("✅ Copied to clipboard!");
  };

  const handleVerifyDomain = async () => {
    if (!coachProfile?.custom_domain) {
      alert("No domain to verify");
      return;
    }

    setIsVerifying(true);
    try {
      const response = await base44.functions.invoke('verifyCustomDomain', { 
        domain: coachProfile.custom_domain 
      });
      
      if (response.data.success) {
        await queryClient.invalidateQueries(['coachProfile']);
        alert(response.data.message);
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error("Verification error:", error);
      alert("❌ Verification check failed. Please ensure DNS records are properly configured and try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const canUseDomain = plan?.can_custom_domain ?? false;

  if (user?.user_type !== 'student_coach') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <Lock className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-center text-2xl">Health Coaches Only</CardTitle>
            <CardDescription className="text-center">
              Custom domain settings are only available for health coaches
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!canUseDomain) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Custom Domain</h1>
            <p className="text-gray-600">Use your own domain for your coaching platform</p>
          </div>

          <Card className="border-none shadow-xl bg-gradient-to-br from-orange-50 to-amber-50">
            <CardHeader>
              <Crown className="w-16 h-16 mx-auto text-orange-500 mb-4" />
              <CardTitle className="text-center text-2xl">Upgrade Required</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="bg-white border-orange-300">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <AlertDescription>
                  <strong>Custom Domain is not included in your current plan.</strong><br/>
                  Upgrade to a higher plan to use your own domain (e.g., coaching.mysite.com) and remove Mealie branding.
                </AlertDescription>
              </Alert>
              <div className="mt-6 text-center">
                <Button 
                  onClick={() => window.location.href = createPageUrl('CoachSubscriptions')}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  View Plans & Upgrade
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusConfig = {
    not_configured: { icon: Globe, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Not Configured' },
    pending_verification: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Pending Verification' },
    active: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Active' },
    failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Verification Failed' }
  };

  const status = coachProfile?.custom_domain_status || 'not_configured';
  const StatusIcon = statusConfig[status].icon;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Custom Domain Settings</h1>
          <p className="text-gray-600">Connect your own domain to your coaching platform</p>
        </div>

        {/* Current Domain Status */}
        {coachProfile?.custom_domain && (
          <Card className="border-none shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-6 h-6 text-blue-500" />
                  Current Domain
                </CardTitle>
                <Badge className={`${statusConfig[status].bg} ${statusConfig[status].color}`}>
                  <StatusIcon className="w-4 h-4 mr-1" />
                  {statusConfig[status].label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900">{coachProfile.custom_domain}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(`https://${coachProfile.custom_domain}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {status === 'active' && coachProfile.domain_configured_date && (
                <Alert className="bg-green-50 border-green-500">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <AlertDescription className="text-green-900">
                    <strong>✅ Domain is active!</strong> Configured on {new Date(coachProfile.domain_configured_date).toLocaleDateString()}
                  </AlertDescription>
                </Alert>
              )}

              {status === 'pending_verification' && (
                <Alert className="bg-yellow-50 border-yellow-500">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <AlertDescription className="text-yellow-900">
                    <strong>⏳ Waiting for DNS verification</strong><br/>
                    Follow the DNS setup instructions below. Verification can take up to 48 hours.
                  </AlertDescription>
                </Alert>
              )}

              {status === 'failed' && (
                <Alert className="bg-red-50 border-red-500">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <AlertDescription className="text-red-900">
                    <strong>❌ Domain verification failed</strong><br/>
                    Please check your DNS settings and contact support if the issue persists.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                variant="destructive"
                onClick={handleRemoveDomain}
                disabled={updateProfileMutation.isPending}
              >
                Remove Domain
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add New Domain */}
        {!coachProfile?.custom_domain && (
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Add Your Custom Domain</CardTitle>
              <CardDescription>
                Use your own domain name (e.g., coaching.mysite.com) for your coaching platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Domain Name</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="coaching.mysite.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    disabled={isAdding}
                  />
                  <Button
                    onClick={handleAddDomain}
                    disabled={isAdding || !domain.trim()}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500"
                  >
                    {isAdding ? "Adding..." : "Add Domain"}
                  </Button>
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-500">
                <AlertDescription className="text-blue-900 text-sm">
                  <strong>💡 Tip:</strong> Use a subdomain like <code className="bg-blue-100 px-1 rounded">coaching.yoursite.com</code> rather than your root domain.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* DNS Setup Instructions */}
        {coachProfile?.custom_domain && status === 'pending_verification' && (
          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader>
              <CardTitle className="text-2xl">DNS Setup Instructions</CardTitle>
              <CardDescription>
                Add these DNS records to your domain registrar (GoDaddy, Namecheap, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* CNAME Record */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-900">1. Add CNAME Record</h3>
                <div className="p-4 bg-white rounded-lg border-2 border-purple-300">
                  <div className="grid grid-cols-3 gap-4 mb-2 text-sm font-semibold text-gray-600">
                    <div>Type</div>
                    <div>Name</div>
                    <div>Value</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="font-mono bg-purple-100 px-2 py-1 rounded">CNAME</div>
                    <div className="font-mono bg-purple-100 px-2 py-1 rounded">{coachProfile.custom_domain.split('.')[0]}</div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono bg-purple-100 px-2 py-1 rounded flex-1">mealie-platform.base44.app</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard('mealie-platform.base44.app')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* TXT Record for Verification */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-900">2. Add TXT Record (Verification)</h3>
                <div className="p-4 bg-white rounded-lg border-2 border-purple-300">
                  <div className="grid grid-cols-3 gap-4 mb-2 text-sm font-semibold text-gray-600">
                    <div>Type</div>
                    <div>Name</div>
                    <div>Value</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="font-mono bg-purple-100 px-2 py-1 rounded">TXT</div>
                    <div className="font-mono bg-purple-100 px-2 py-1 rounded">_mealie-verify</div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono bg-purple-100 px-2 py-1 rounded flex-1 text-xs">{coachProfile.domain_verification_code}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(coachProfile.domain_verification_code)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Alert className="bg-orange-50 border-orange-500">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <AlertDescription className="text-orange-900">
                  <strong>⏰ DNS Propagation Time:</strong><br/>
                  DNS changes can take 24-48 hours to propagate. We'll automatically verify your domain once the records are detected.
                </AlertDescription>
              </Alert>

              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleVerifyDomain}
                  disabled={isVerifying}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  size="lg"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Verify DNS Records
                    </>
                  )}
                </Button>
              </div>

              <div className="p-4 bg-white rounded-lg border-2 border-blue-300">
                <h4 className="font-bold text-gray-900 mb-2">📚 Need Help?</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Login to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)</li>
                  <li>• Find "DNS Settings" or "DNS Management"</li>
                  <li>• Add the CNAME and TXT records exactly as shown above</li>
                  <li>• Wait 24-48 hours for verification</li>
                  <li>• Contact support if verification fails after 48 hours</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Benefits of Custom Domain */}
        {!coachProfile?.custom_domain && (
          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader>
              <CardTitle className="text-2xl">Why Use a Custom Domain?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-lg">
                  <h4 className="font-bold text-gray-900 mb-2">🎯 Professional Branding</h4>
                  <p className="text-sm text-gray-600">Use your own domain instead of mealie.app subdomain</p>
                </div>
                <div className="p-4 bg-white rounded-lg">
                  <h4 className="font-bold text-gray-900 mb-2">🔒 Trust & Credibility</h4>
                  <p className="text-sm text-gray-600">Clients trust your own domain more</p>
                </div>
                <div className="p-4 bg-white rounded-lg">
                  <h4 className="font-bold text-gray-900 mb-2">📈 SEO Benefits</h4>
                  <p className="text-sm text-gray-600">Better search engine ranking with your domain</p>
                </div>
                <div className="p-4 bg-white rounded-lg">
                  <h4 className="font-bold text-gray-900 mb-2">✨ White Label</h4>
                  <p className="text-sm text-gray-600">Remove all Mealie branding completely</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}