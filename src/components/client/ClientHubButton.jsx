import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function ClientHubButton({ clientId, size = "sm", className = "" }) {
  const navigate = useNavigate();

  return (
    <Button
      size={size}
      className={`bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold ${className}`}
      onClick={() => navigate(`${createPageUrl("ClientHub")}?clientId=${clientId}`)}
    >
      <ExternalLink className="w-3 h-3 mr-1" /> Open Client Page
    </Button>
  );
}