import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { Image as ImageIcon, Loader2, CheckCircle, Upload, Info } from "lucide-react";

export default function ImageUploader({ 
  onImageUploaded, 
  currentImageUrl = null,
  requiredWidth = 800,
  requiredHeight = 600,
  aspectRatio = null, // e.g., "16:9" or "4:3"
  maxSizeMB = 5,
  label = "Upload Photo"
}) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl);

  const resizeImage = (file, targetWidth, targetHeight) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set canvas dimensions to target size
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          
          // Calculate scaling to fit image while maintaining aspect ratio
          const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          
          // Center the image
          const x = (targetWidth - scaledWidth) / 2;
          const y = (targetHeight - scaledHeight) / 2;
          
          // Fill background with white
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          
          // Draw resized image
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
          
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, 'image/jpeg', 0.9);
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert("❌ Please select an image file (JPG, PNG)");
      return;
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      alert(`❌ File too large! Maximum size is ${maxSizeMB}MB. Your file is ${fileSizeMB.toFixed(1)}MB`);
      return;
    }

    setUploading(true);

    try {
       // Resize image to required dimensions
       const resizedBlob = await resizeImage(file, requiredWidth, requiredHeight);

       // Create FormData to properly send the file
       const formData = new FormData();
       formData.append('file', resizedBlob, file.name);

       // Upload the resized image
       const result = await base44.integrations.Core.UploadFile({ file: resizedBlob });

       setPreviewUrl(result.file_url);
       onImageUploaded(result.file_url);

       alert(`✅ Image uploaded and automatically resized to ${requiredWidth}x${requiredHeight}px!`);
     } catch (error) {
       console.error("Error processing image:", error);
       alert("❌ Failed to upload image. Please try again.");
     } finally {
       setUploading(false);
     }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">{label}</Label>
      
      <Alert className="bg-blue-50 border-blue-300">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-900">
          <strong>📏 Required Size:</strong> {requiredWidth} x {requiredHeight} pixels
          {aspectRatio && <span className="ml-2">({aspectRatio} aspect ratio)</span>}
          <br />
          <strong>📦 Max File Size:</strong> {maxSizeMB}MB
          <br />
          <span className="text-xs text-blue-700 mt-1 block">
            ✨ Don't worry! Images will be automatically resized to fit if needed.
          </span>
        </AlertDescription>
      </Alert>

      {previewUrl && (
        <div className="relative w-full rounded-lg overflow-hidden border-2 border-green-500" style={{ height: '200px' }}>
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="w-full h-full object-cover"
          />
          <Badge className="absolute top-2 right-2 bg-green-500 text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            {requiredWidth}x{requiredHeight}px
          </Badge>
        </div>
      )}

      <div className="p-6 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors">
        <div className="text-center">
          <ImageIcon className="w-12 h-12 mx-auto text-blue-500 mb-3" />
          <p className="text-sm text-gray-700 mb-3 font-semibold">
            {previewUrl ? 'Change Photo' : 'Upload Photo'}
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="w-full p-2 border rounded-lg text-sm cursor-pointer"
            disabled={uploading}
          />
          {uploading && (
            <div className="mt-3">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              <p className="text-sm text-blue-700 mt-2">Resizing and uploading...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}