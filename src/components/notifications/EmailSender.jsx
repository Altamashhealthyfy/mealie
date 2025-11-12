import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Loader2, CheckCircle, AlertTriangle, Copy, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";

export default function EmailSender({ client, onClose, template = null }) {
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body || "");
  const [copied, setCopied] = useState(false);

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
    if (!subject.trim() || !body.trim()) {
      alert("⚠️ Please enter subject and message first!");
      return;
    }

    const gmailSubject = encodeURIComponent(subject);
    const gmailBody = encodeURIComponent(`${body}\n\n---\nBest regards,\nTeam Mealie\nHealth Coach Platform`);
    const gmailTo = encodeURIComponent(client.email);
    
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${gmailTo}&su=${gmailSubject}&body=${gmailBody}`;
    window.open(gmailUrl, '_blank');
    
    // Show success message and close after a short delay
    setTimeout(() => {
      alert("✅ Gmail opened successfully! Review and click Send in Gmail to deliver your message.");
      onClose();
    }, 500);
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
            <AlertTitle className="text-green-900 font-bold">✅ Gmail Compose Method</AlertTitle>
            <AlertDescription className="text-green-800">
              <strong>This is the ONLY working method!</strong> Opens Gmail in a new tab with your message pre-filled.
              Works for <strong>ANY email address</strong> - No restrictions!
            </AlertDescription>
          </Alert>

          <Alert className="bg-orange-50 border-orange-300">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertTitle className="text-orange-900">⚠️ Platform Limitation</AlertTitle>
            <AlertDescription className="text-orange-800 text-sm">
              Base44 direct email sending only works for registered app users. 
              <strong> Always use Gmail method below.</strong>
            </AlertDescription>
          </Alert>

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
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              💬 Email Message *
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message here...&#10;&#10;Example:&#10;Hi [Client Name],&#10;&#10;Welcome to your health journey with Mealie!&#10;&#10;I'm excited to work with you..."
              rows={12}
              className="resize-none text-base"
            />
          </div>

          <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
            <p className="text-xs font-semibold text-blue-900 mb-2">📋 How Gmail Method Works:</p>
            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
              <li>Enter subject and message above</li>
              <li>Click "Open Gmail Compose" button below</li>
              <li>Gmail opens in new tab with everything pre-filled</li>
              <li>Review and edit if needed</li>
              <li>Click "Send" in Gmail</li>
              <li>Email delivered! ✅</li>
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={copyToClipboard}
              className="h-14"
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
              disabled={!subject.trim() || !body.trim()}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-14 text-lg font-bold shadow-xl"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Open Gmail Compose
            </Button>
          </div>

          <Alert className="bg-gray-50 border-gray-300">
            <Mail className="w-4 h-4 text-gray-600" />
            <AlertDescription className="text-xs text-gray-600">
              💡 <strong>Pro Tip:</strong> After composing in Gmail, you can save as a template for future use!
              Gmail also lets you schedule emails, add attachments, and use rich formatting.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}