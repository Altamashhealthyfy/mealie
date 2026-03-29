import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Copy,
  Download,
  Share2,
  QrCode,
  Users,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Info
} from "lucide-react";
import { toast } from "sonner";

export default function CoachReferralLink() {
  const [copied, setCopied] = useState(false);
  const qrCodeRef = useRef(null);

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

  const { data: clients } = useQuery({
    queryKey: ['coachClients', user?.email],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list('-created_date', 1000);
      return allClients.filter(client => {
        const assignedCoaches = Array.isArray(client.assigned_coach) ? client.assigned_coach : client.assigned_coach ? [client.assigned_coach] : [];
        return client.created_by === user?.email || assignedCoaches.includes(user?.email);
      });
    },
    enabled: !!user,
    initialData: [],
  });

  // Generate referral link — uses the current app's actual domain so QR/link always work
  const appBaseUrl = `${window.location.protocol}//${window.location.host}`;
  const referralLink = `${appBaseUrl}/ClientOnboarding?ref=${encodeURIComponent(user?.email || '')}`;
  
  // Generate QR code URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(referralLink)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${coachProfile?.business_name || 'coach'}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR code downloaded!");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${coachProfile?.business_name || 'My Health Coaching'}`,
          text: 'Start your health journey with me!',
          url: referralLink,
        });
        toast.success("Shared successfully!");
      } catch (error) {
        if (error.name !== 'AbortError') {
          toast.error("Sharing failed");
        }
      }
    } else {
      handleCopyLink();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Share Your Coaching Link
            </h1>
            <p className="text-gray-600">
              Get clients to sign up directly under your coaching practice
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Share2 className="w-8 h-8 text-orange-500" />
            <Sparkles className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Clients</p>
                  <p className="text-3xl font-bold text-orange-600">{clients.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Link Shares</p>
                  <p className="text-3xl font-bold text-green-600">∞</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Share2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <Badge className="bg-green-500 text-white">Active</Badge>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Card - Referral Link */}
        <Card className="border-2 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-orange-500" />
              Your Unique Referral Link
            </CardTitle>
            <CardDescription>
              Share this link with potential clients to get them signed up under your coaching
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Unique coach identifier highlight */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">🔑 Your Unique Coach ID</p>
                <p className="text-lg font-bold font-mono">{user?.email}</p>
                <p className="text-xs opacity-80 mt-1">This ID is embedded in your link — clients are tied directly to you</p>
              </div>
              <Badge className="bg-white text-orange-600 font-bold text-sm px-3 py-1">Unique to You</Badge>
            </div>

            <div className="flex gap-2">
              <Input
                value={referralLink}
                readOnly
                className="font-mono text-sm bg-gray-50"
              />
              <Button onClick={handleCopyLink} className="shrink-0 bg-orange-500 hover:bg-orange-600">
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
              <Button onClick={handleShare} variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>

            <Alert className="bg-green-50 border-green-300">
              <Info className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ✅ When a client scans your QR code or opens this link, they land <strong>directly on your registration page</strong> and are automatically assigned to you.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* QR Code Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-purple-500" />
                QR Code
              </CardTitle>
              <CardDescription>
                Print or share this QR code for easy mobile access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center p-6 bg-white rounded-lg border-2 border-gray-200">
                <img
                  ref={qrCodeRef}
                  src={qrCodeUrl}
                  alt="Referral QR Code"
                  className="w-64 h-64"
                />
              </div>
              <Button onClick={handleDownloadQR} className="w-full" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download QR Code
              </Button>
            </CardContent>
          </Card>

          {/* Usage Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                How to Use
              </CardTitle>
              <CardDescription>
                Make the most of your referral link
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-orange-600">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Share Your Link</h3>
                    <p className="text-sm text-gray-600">
                      Copy and share your unique link on social media, email, or messaging apps
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-green-600">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Use QR Code</h3>
                    <p className="text-sm text-gray-600">
                      Print the QR code for business cards, flyers, or display at your clinic
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-purple-600">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Auto-Assignment</h3>
                    <p className="text-sm text-gray-600">
                      Clients who sign up through your link are automatically added to your client list
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-blue-600">4</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Track Growth</h3>
                    <p className="text-sm text-gray-600">
                      Monitor your client count in the dashboard and see your practice grow
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Marketing Tips */}
        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              Marketing Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">📱 Social Media</h4>
                <p className="text-sm text-gray-600">
                  Add your link to Instagram bio, Facebook page, and LinkedIn profile
                </p>
              </div>
              <div className="p-4 bg-white rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">📧 Email Signature</h4>
                <p className="text-sm text-gray-600">
                  Include your referral link in your email signature for easy sharing
                </p>
              </div>
              <div className="p-4 bg-white rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">💼 Business Cards</h4>
                <p className="text-sm text-gray-600">
                  Print the QR code on business cards for quick mobile access
                </p>
              </div>
              <div className="p-4 bg-white rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">🎯 Content Marketing</h4>
                <p className="text-sm text-gray-600">
                  Add your link to blog posts, videos, and educational content
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}