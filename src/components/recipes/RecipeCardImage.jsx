import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChefHat, Edit, Trash2 } from "lucide-react";

export default function RecipeCardImage({ recipe, isClient, canEdit, canDelete, onEdit, onDelete }) {
  const [imgError, setImgError] = useState(false);
  const showPlaceholder = !recipe.image_url || imgError;

  return (
    <div className="h-48 rounded-t-xl overflow-hidden relative">
      {showPlaceholder ? (
        <div className="w-full h-full bg-gradient-to-br from-orange-100 via-amber-100 to-red-100 flex items-center justify-center">
          <ChefHat className="w-16 h-16 text-orange-400 opacity-40" />
        </div>
      ) : (
        <img
          src={recipe.image_url}
          alt={recipe.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          onError={() => setImgError(true)}
        />
      )}
      {!isClient && (canEdit || canDelete) && (
        <div className="absolute top-2 right-2 flex gap-2">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onEdit(recipe); }}
              className="bg-white/90 hover:bg-white text-blue-600 h-8 w-8 p-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDelete(recipe); }}
              className="bg-white/90 hover:bg-white text-red-600 h-8 w-8 p-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}