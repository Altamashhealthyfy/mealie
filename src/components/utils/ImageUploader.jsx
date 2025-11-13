import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const resizeImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.9) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          
          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type || 'image/jpeg',
                lastModified: Date.now(),
              });
              
              resolve({
                file: resizedFile,
                originalSize: { width: img.width, height: img.height },
                newSize: { width, height },
                wasResized: img.width > maxWidth || img.height > maxHeight
              });
            } else {
              reject(new Error('Failed to resize image'));
            }
          },
          file.type || 'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export default function ImageUploader({ 
  currentImageUrl, 
  onImageUploaded, 
  recommendedWidth = 1200, 
  recommendedHeight = 800,
  label = "Upload Photo",
  className = ""
}) {
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please select an image file");
      return;
    }

    setUploading(true);
    try {
      const resizeResult = await resizeImage(file, recommendedWidth, recommendedHeight, 0.9);
      
      if (resizeResult.wasResized) {
        alert(`📐 Image auto-resized from ${resizeResult.originalSize.width}x${resizeResult.originalSize.height} to ${resizeResult.newSize.width}x${resizeResult.newSize.height}`);
      }
      
      const result = await base44.integrations.Core.UploadFile({ file: resizeResult.file });
      onImageUploaded(result.file_url);
      alert("✅ Image uploaded successfully!");
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="space-y-3">
        {currentImageUrl && (
          <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-green-500">
            <img 
              src={currentImageUrl} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
            <Badge className="absolute top-2 right-2 bg-green-500">
              ✅ Uploaded
            </Badge>
          </div>
        )}
        <div className="p-6 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50">
          <div className="text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-blue-500 mb-3" />
            <p className="text-sm font-semibold text-gray-900 mb-1">
              📐 Recommended Size: {recommendedWidth} x {recommendedHeight} pixels
            </p>
            <p className="text-xs text-gray-600 mb-3">
              Images will be automatically resized if larger. JPG or PNG format.
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full p-2 border rounded-lg text-sm"
              disabled={uploading}
            />
            {uploading && (
              <div className="mt-3">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                <p className="text-sm text-blue-700">Uploading & optimizing image...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}