import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Send, Loader2, CheckCircle, AlertCircle, ExternalLink, Copy } from "lucide-react";

export default function EmailSender({ client, onClose, template = null }) {
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body || "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError("Please fill in both the subject and message.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const res = await base44.functions.invoke('sendEmail', {
        to: client.email,
        subject: subject.trim(),
        body: body.trim(),
      });

      if (res.data?.success) {
        setSent(true);
        setTimeout(() => onClose(), 2000);
      } else {
        setError(res.data?.error || "Failed to send email.");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSending(false);
    }
  };

  const openInGmail = () => {
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(client.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  };

  const copyText = () => {
    navigator.clipboard.writeText(`To: ${client.email}\nSubject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mail className="w-5 h-5 text-blue-600" />
            Email to {client.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Recipient */}
          <div className="p-3 bg-gray-50 rounded-lg border text-sm">
            <span className="text-gray-500">To:</span>{" "}
            <span className="font-semibold text-gray-900">{client.full_name}</span>{" "}
            <span className="text-gray-500">&lt;{client.email}&gt;</span>
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Subject *</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              disabled={sending || sent}
            />
          </div>

          {/* Body */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Message *</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message here..."
              rows={10}
              className="resize-none"
              disabled={sending || sent}
            />
          </div>

          {/* Error */}
          {error && (
            <Alert className="bg-red-50 border-red-300">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {/* Success */}
          {sent && (
            <Alert className="bg-green-50 border-green-300">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Email sent successfully! ✅<br/>
                <span className="text-xs text-green-700 mt-1 block">
                  ⚠️ Ask the client to check their <strong>Spam / Junk</strong> folder if they don't see it in inbox. The email is sent from <strong>contactus@healthyfy.com</strong>.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSend}
              disabled={sending || sent || !subject.trim() || !body.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
              ) : sent ? (
                <><CheckCircle className="w-4 h-4 mr-2" /> Sent!</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Send Email</>
              )}
            </Button>
            <Button variant="outline" onClick={copyText} disabled={sending || sent}>
              {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button variant="outline" onClick={openInGmail} disabled={sending || sent}>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-400 text-center">Sent via Gmail · Copy or open in Gmail as backup</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}