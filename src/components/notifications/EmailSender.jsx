import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Loader2, CheckCircle, AlertTriangle, Copy, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EmailSender({ client, onClose, template = null }) {
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body || "");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const sendEmail = async () => {
    if (!subject.trim() || !body.trim()) {
      setError("Please enter subject and message");
      return;
    }

    if (!client.email || !client.email.includes('@')) {
      setError("Invalid email address for client");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); padding: 40px 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                🍽️ Mealie
              </h1>
              <p style="color: white; margin: 8px 0 0 0; font-size: 16px; opacity: 0.95;">
                Your Health, Our Priority
              </p>
            </td>
          </tr>
          <tr>
            <td style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                ${subject}
              </h2>
              <div style="color: #4b5563; line-height: 1.8; font-size: 16px; white-space: pre-wrap;">
${body}
              </div>
              <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 15px; margin: 0 0 10px 0;">
                  Best regards,
                </p>
                <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0;">
                  Team Mealie
                </p>
                <p style="color: #9ca3af; font-size: 14px; margin: 10px 0 0 0;">
                  Health Coach Platform
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="text-align: center; padding: 30px 20px; color: #9ca3af; font-size: 13px;">
              <p style="margin: 0 0 8px 0;">
                This email was sent from Mealie Health Coach Platform
              </p>
              <p style="margin: 0; color: #d1d5db;">
                © ${new Date().getFullYear()} Mealie. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      console.log("Sending email to:", client.email);
      console.log("Subject:", subject);

      await base44.integrations.Core.SendEmail({
        from_name: "Mealie - Health Coach Platform",
        to: client.email,
        subject: subject,
        body: htmlBody
      });

      console.log("Email sent successfully!");
      setSent(true);
      
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Email send error:", err);
      
      // Check if it's a Base44 restriction error
      if (err.message?.includes("outside") || err.message?.includes("registered") || err.message?.includes("user")) {
        setError("⚠️ Base44 Email Limitation: Can only send to registered app users. Use the 'Copy & Use Gmail' option instead.");
      } else {
        setError(err.message || "Failed to send email. Please try the Gmail option below.");
      }
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = () => {
    const emailContent = `To: ${client.email}
Subject: ${subject}

${body}

---
Best regards,
Team Mealie
Health Coach Platform`;

    navigator.clipboard.writeText(emailContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInGmail = () => {
    const gmailSubject = encodeURIComponent(subject);
    const gmailBody = encodeURIComponent(`${body}\n\n---\nBest regards,\nTeam Mealie\nHealth Coach Platform`);
    const gmailTo = encodeURIComponent(client.email);
    
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${gmailTo}&su=${gmailSubject}&body=${gmailBody}`;
    window.open(gmailUrl, '_blank');
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-600" />
            Send Email to {client.full_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="direct" className="mt-4">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="direct">📧 Direct Send</TabsTrigger>
            <TabsTrigger value="gmail">✉️ Gmail Compose</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-4 mt-4">
            <Alert className="bg-orange-50 border-orange-300">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <AlertTitle className="text-orange-900">⚠️ Limitation Notice</AlertTitle>
              <AlertDescription className="text-orange-800 text-sm">
                <strong>Base44 Platform Restriction:</strong> Direct email sending only works for users registered in the app.
                <br/>
                <strong>Solution:</strong> Use the "Gmail Compose" tab above to send emails to any client!
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Sending to:</p>
              <p className="font-bold text-lg text-gray-900">{client.full_name}</p>
              <p className="text-sm text-gray-600">{client.email}</p>
            </div>

            {error && (
              <Alert className="border-red-500 bg-red-50">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {sent ? (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  ✅ Email sent successfully!
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject *</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject..."
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Message *</label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Type your message here..."
                    rows={12}
                    className="resize-none text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                    disabled={sending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={sendEmail}
                    disabled={sending || !subject.trim() || !body.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 h-12"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending Email...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Try Direct Send
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="gmail" className="space-y-4 mt-4">
            <Alert className="bg-green-50 border-green-500">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertTitle className="text-green-900">✅ Recommended Method</AlertTitle>
              <AlertDescription className="text-green-800 text-sm">
                <strong>This method always works!</strong> Opens Gmail in a new tab with your message pre-filled.
                You can send to any email address without restrictions.
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Recipient:</p>
              <p className="font-bold text-lg text-gray-900">{client.full_name}</p>
              <p className="text-sm font-semibold text-gray-700">📧 {client.email}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Subject *</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message *</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your message here..."
                rows={12}
                className="resize-none text-sm"
              />
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-900 mb-2">📋 How it works:</p>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>Click "Open Gmail Compose" button below</li>
                <li>Gmail opens in new tab with everything pre-filled</li>
                <li>Review and edit if needed</li>
                <li>Click Send in Gmail</li>
                <li>Email delivered! ✅</li>
              </ol>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={copyToClipboard}
                className="h-12"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Email Text
                  </>
                )}
              </Button>
              <Button
                onClick={openInGmail}
                disabled={!subject.trim() || !body.trim()}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-12 text-base font-semibold"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Open Gmail Compose
              </Button>
            </div>

            <Alert className="bg-gray-50 border-gray-300">
              <Mail className="w-4 h-4 text-gray-600" />
              <AlertDescription className="text-xs text-gray-600">
                💡 <strong>Pro Tip:</strong> After composing in Gmail, you can save as a template for future use!
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}