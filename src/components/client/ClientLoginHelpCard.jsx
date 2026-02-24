import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function ClientLoginHelpCard() {
  return (
    <Card className="border-2 border-orange-500 bg-gradient-to-br from-orange-50 to-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <AlertTriangle className="w-6 h-6" />
          Important: How to Give Clients Login Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-700">
          <strong>Creating a Client Profile is NOT enough!</strong> Clients need a <strong>login account</strong> to access the app.
        </p>

        <div className="bg-white p-4 rounded-lg border-2 border-orange-200">
          <p className="font-semibold text-orange-900 mb-3">📋 Step-by-Step Process:</p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li><strong>Step 1:</strong> Create Client Profile here (you already did this ✅)</li>
            <li><strong>Step 2:</strong> Go to <strong>Dashboard → Data → User</strong></li>
            <li><strong>Step 3:</strong> Click <strong>"Invite User"</strong> button</li>
            <li><strong>Step 4:</strong> Enter client's email (MUST match email in Client Profile)</li>
            <li><strong>Step 5:</strong> Set <code>user_type</code> = <code>"client"</code></li>
            <li><strong>Step 6:</strong> Click Save - Client receives invitation email 📧</li>
            <li><strong>Step 7:</strong> Client clicks link in email and sets password 🔐</li>
            <li><strong>Step 8:</strong> Client can now login and see their meal plan!</li>
          </ol>
        </div>

        <Alert className="bg-green-50 border-green-300">
          <CheckCircle2 className="h-4 w-4 text-green-700" />
          <AlertTitle className="text-green-800">Why Two Steps?</AlertTitle>
          <AlertDescription className="text-sm text-green-700">
            For security, only platform admins can invite users. This prevents unauthorized access.
          </AlertDescription>
        </Alert>

        <Alert className="bg-yellow-50 border-yellow-300">
          <AlertTriangle className="h-4 w-4 text-yellow-700" />
          <AlertTitle className="text-yellow-800">Email Must Match</AlertTitle>
          <AlertDescription className="text-sm text-yellow-700">
            The email in Client Profile MUST exactly match the email used when inviting the user!
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}