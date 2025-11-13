import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Loader2, CheckCircle, AlertTriangle, Copy, ExternalLink, Send } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EmailSender({ client, onClose, template = null }) {
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body || "");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const copyToClipboard = () => {
    const emailContent = `To: ${client.email}
Subject: ${subject}

${body}

---
Best regards,
Healthyfy Team
contactus@healthyfy.com`;

    navigator.clipboard.writeText(emailContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInGmail = () => {
    if (!subject.trim() || !body.trim()) {
      alert("⚠️ Please enter subject and message first!");
      return;
    }

    const gmailSubject = encodeURIComponent(subject);
    const gmailBody = encodeURIComponent(`${body}\n\n---\nBest regards,\nHealthyfy Team\ncontactus@healthyfy.com`);
    const gmailTo = encodeURIComponent(client.email);
    
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${gmailTo}&su=${gmailSubject}&body=${gmailBody}`;
    window.open(gmailUrl, '_blank');
  };

  const sendDirectEmail = async () => {
    if (!subject.trim() || !body.trim()) {
      alert("⚠️ Please enter subject and message first!");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await base44.functions.invoke('sendGoogleWorkspaceEmail', {
        to: client.email,
        subject: subject,
        body: body + '\n\n---\nBest regards,\nHealthyfy Team\ncontactus@healthyfy.com'
      });

      if (response.data.success) {
        setSent(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(response.data.error || 'Failed to send email');
      }
    } catch (error) {
      console.error("Error sending email:", error);
      setError(error.message || 'Failed to send email. Please try Gmail method.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Mail className="w-6 h-6 text-green-600" />
            Send Email to {client.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Alert className="bg-green-50 border-green-500 border-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <AlertTitle className="text-green-900 font-bold">✅ Send from contactus@healthyfy.com</AlertTitle>
            <AlertDescription className="text-green-800">
              Emails will be sent directly from your professional Google Workspace email!
            </AlertDescription>
          </Alert>

          {error && (
            <Alert className="bg-red-50 border-red-500">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <AlertTitle className="text-red-900">Error Sending Email</AlertTitle>
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {sent && (
            <Alert className="bg-green-50 border-green-500">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <AlertTitle className="text-green-900">✅ Email Sent Successfully!</AlertTitle>
              <AlertDescription className="text-green-800">
                Your email has been sent from contactus@healthyfy.com to {client.email}
              </AlertDescription>
            </Alert>
          )}

          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
            <p className="text-sm text-gray-600 mb-1">Recipient:</p>
            <p className="font-bold text-lg text-gray-900">{client.full_name}</p>
            <p className="text-sm font-semibold text-gray-700 flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4 text-green-600" />
              {client.email}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              📧 Email Subject *
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              className="h-12 text-base"
              disabled={sending || sent}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              💬 Email Message *
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message here...&#10;&#10;Example:&#10;Hi [Client Name],&#10;&#10;Welcome to your health journey with Healthyfy!&#10;&#10;I'm excited to work with you..."
              rows={12}
              className="resize-none text-base"
              disabled={sending || sent}
            />
          </div>

          <Tabs defaultValue="direct" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="direct">
                <Send className="w-4 h-4 mr-2" />
                Send Directly
              </TabsTrigger>
              <TabsTrigger value="gmail">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Gmail (Backup)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="space-y-4 mt-4">
              <Alert className="bg-blue-50 border-blue-300">
                <Mail className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-900">
                  📧 <strong>Direct Send:</strong> Email will be sent instantly from contactus@healthyfy.com through your Google Workspace account.
                </AlertDescription>
              </Alert>

              <Button
                onClick={sendDirectEmail}
                disabled={sending || sent || !subject.trim() || !body.trim()}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-14 text-lg font-bold shadow-xl"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending Email...
                  </>
                ) : sent ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Email Sent!
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send Email Now
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="gmail" className="space-y-4 mt-4">
              <Alert className="bg-blue-50 border-blue-300">
                <ExternalLink className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-900">
                  📋 <strong>Gmail Method:</strong> Opens Gmail with pre-filled message as backup option.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={copyToClipboard}
                  className="h-14"
                  disabled={sending || sent}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 mr-2" />
                      Copy Email Text
                    </>
                  )}
                </Button>
                <Button
                  onClick={openInGmail}
                  disabled={!subject.trim() || !body.trim() || sending || sent}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 h-14 font-bold"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Open Gmail
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}