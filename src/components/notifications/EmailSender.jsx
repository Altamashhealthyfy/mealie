import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";

export default function EmailSender({ client, onClose, template = null }) {
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body || "");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

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
      // Create beautiful HTML email
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
          <!-- Header -->
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
          
          <!-- Body -->
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
          
          <!-- Footer -->
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
      setError(err.message || "Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Send Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">To:</p>
            <p className="font-semibold">{client.full_name}</p>
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
                <p className="text-xs text-gray-500">
                  💡 Your message will be sent in a beautifully formatted email template
                </p>
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
                      Send Email
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}