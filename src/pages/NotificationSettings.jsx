import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Mail,
  MessageCircle,
  CheckCircle2,
  Settings,
  Send,
  Clock,
  Sparkles
} from "lucide-react";
import WhatsAppSender from "@/components/notifications/WhatsAppSender";
import EmailSender from "@/components/notifications/EmailSender";
import { EMAIL_TEMPLATES, WHATSAPP_TEMPLATES, fillTemplate } from "@/components/notifications/NotificationTemplates";

export default function NotificationSettings() {
  const queryClient = useQueryClient();
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const testEmail = async () => {
    setTestingEmail(true);
    try {
      await base44.integrations.Core.SendEmail({
        from_name: "Mealie - Health Coach Platform",
        to: user?.email,
        subject: "Test Email from Mealie",
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #f97316;">✅ Email System Working!</h1>
            <p>This is a test email from your Mealie platform.</p>
            <p>If you received this, your email system is configured correctly.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Sent from Mealie Health Coach Platform</p>
          </div>
        `
      });
      alert("✅ Test email sent! Check your inbox.");
    } catch (error) {
      alert("❌ Failed to send test email. Check console for details.");
      console.error(error);
    } finally {
      setTestingEmail(false);
    }
  };

  const testWhatsApp = async () => {
    if (!user?.phone) {
      alert("Please add your phone number in profile first");
      return;
    }

    setTestingWhatsApp(true);
    try {
      const phone = user.phone.replace(/\D/g, '');
      const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;

      // Use Aisensy's direct message API (no campaign ID needed)
      const response = await fetch('https://backend.aisensy.com/direct/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.AISENSY_API_KEY || "YOUR_API_KEY"
        },
        body: JSON.stringify({
          to: formattedPhone,
          type: "text",
          text: {
            body: "✅ Test message from Mealie!\n\nYour WhatsApp integration is working correctly.\n\nYou'll receive automated notifications here for:\n- Meal plans\n- Appointments\n- Progress updates\n\n- Team Mealie"
          }
        })
      });

      if (response.ok) {
        alert("✅ Test WhatsApp sent! Check your phone.");
      } else {
        const error = await response.json();
        alert(`❌ Failed: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      alert("❌ Failed to send test WhatsApp. Check console for details.");
      console.error(error);
    } finally {
      setTestingWhatsApp(false);
    }
  };

  const automatedNotifications = [
    {
      name: "Welcome Message",
      description: "Sent when a new client is added",
      trigger: "Client creation",
      channels: ["email", "whatsapp"],
      enabled: true
    },
    {
      name: "Meal Plan Ready",
      description: "When a new meal plan is assigned",
      trigger: "Meal plan assignment",
      channels: ["email", "whatsapp"],
      enabled: true
    },
    {
      name: "Appointment Reminder",
      description: "24 hours before appointment",
      trigger: "Scheduled time",
      channels: ["email", "whatsapp"],
      enabled: true
    },
    {
      name: "Progress Milestone",
      description: "When client achieves a goal",
      trigger: "Progress update",
      channels: ["email", "whatsapp"],
      enabled: true
    },
    {
      name: "Inactive Client",
      description: "After 7 days of no activity",
      trigger: "Inactivity period",
      channels: ["email"],
      enabled: false
    }
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-8 h-8 text-orange-500" />
            <Badge className="bg-orange-500 text-white">Notification Center</Badge>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-2">Notifications</h1>
          <p className="text-xl text-gray-600">Manage email and WhatsApp notifications</p>
        </div>

        {/* Quick Test Section */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Settings className="w-6 h-6 text-blue-500" />
              Test Your Connections
            </CardTitle>
            <CardDescription>Send test messages to verify setup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-white rounded-xl border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Email System</h3>
                    <p className="text-sm text-gray-600">Test email delivery</p>
                  </div>
                </div>
                <Button
                  onClick={testEmail}
                  disabled={testingEmail}
                  className="w-full bg-blue-500 hover:bg-blue-600"
                >
                  {testingEmail ? "Sending..." : "Send Test Email"}
                </Button>
              </div>

              <div className="p-6 bg-white rounded-xl border-2 border-green-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">WhatsApp API</h3>
                    <p className="text-sm text-gray-600">Test Aisensy connection</p>
                  </div>
                </div>
                <Button
                  onClick={testWhatsApp}
                  disabled={testingWhatsApp}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {testingWhatsApp ? "Sending..." : "Send Test WhatsApp"}
                </Button>
              </div>
            </div>

            <Alert className="bg-orange-50 border-orange-500">
              <Sparkles className="w-4 h-4 text-orange-600" />
              <AlertDescription>
                <strong>Note:</strong> Test messages will be sent to your email ({user?.email}) and phone ({user?.phone || 'Add phone in profile'}).
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Automated Notifications */}
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
            <CardTitle className="text-2xl">Automated Notifications</CardTitle>
            <CardDescription className="text-white/90">
              Automatically send notifications on specific events
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {automatedNotifications.map((notification, index) => (
                <div
                  key={index}
                  className="p-4 border-2 rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">{notification.name}</h3>
                        {notification.enabled ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline">Disabled</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{notification.description}</p>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {notification.trigger}
                        </Badge>
                        {notification.channels.map((channel) => (
                          <Badge key={channel} variant="outline" className="text-xs">
                            {channel === 'email' ? (
                              <Mail className="w-3 h-3 mr-1" />
                            ) : (
                              <MessageCircle className="w-3 h-3 mr-1" />
                            )}
                            {channel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant={notification.enabled ? "outline" : "default"}
                      size="sm"
                      className={notification.enabled ? "" : "bg-green-600 hover:bg-green-700"}
                    >
                      {notification.enabled ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Templates Preview */}
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <CardTitle className="text-2xl">Message Templates</CardTitle>
            <CardDescription className="text-white/90">
              Pre-configured templates for common notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs defaultValue="email">
              <TabsList className="grid grid-cols-2 w-full max-w-md">
                <TabsTrigger value="email">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Templates
                </TabsTrigger>
                <TabsTrigger value="whatsapp">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp Templates
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-4 mt-4">
                {Object.entries(EMAIL_TEMPLATES).map(([key, template]) => (
                  <div key={key} className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-bold mb-2">{template.subject}</h3>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                      {template.body.substring(0, 200)}...
                    </pre>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="whatsapp" className="space-y-4 mt-4">
                {Object.entries(WHATSAPP_TEMPLATES).map(([key, template]) => (
                  <div key={key} className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                    <h3 className="font-bold mb-2 capitalize">{key.toLowerCase().replace(/_/g, ' ')}</h3>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                      {template}
                    </pre>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* API Configuration Info */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-gray-50 to-white">
          <CardHeader>
            <CardTitle className="text-2xl">API Configuration</CardTitle>
            <CardDescription>Your notification service credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 border-blue-500">
              <Settings className="w-4 h-4 text-blue-600" />
              <AlertDescription>
                <strong>Aisensy WhatsApp API:</strong> Configured via platform secrets<br/>
                <strong>Email Service:</strong> Using Base44 built-in email service<br/>
                <strong>Method:</strong> Direct messaging (no campaign templates needed)
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                <strong>To update credentials:</strong> Go to Base44 Dashboard → Settings → Secrets
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-white rounded border">
                  <p className="text-xs text-gray-500">Required Secret:</p>
                  <code className="text-sm font-mono text-blue-600">AISENSY_API_KEY</code>
                  <p className="text-xs text-gray-600 mt-1">Your Aisensy API key from dashboard</p>
                </div>
              </div>
            </div>

            <Alert className="bg-green-50 border-green-500">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription>
                <strong>Simplified Setup:</strong> Only API key needed - no campaign ID or templates required!
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}