"use client";

import React, { useState, useEffect } from "react";
import { 
  LuX, 
  LuTag, 
  LuStar, 
  LuHeart, 
  LuSave,
  LuPlus,
  LuGlobe,
  LuLock,
  LuBookOpen
} from "react-icons/lu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Simulation, 
  SimulationMetadata, 
  simulationCategories, 
  createDefaultMetadata 
} from "@/types/simulation";
import { MetadataManager } from "@/lib/metadataUtils";

interface SimulationMetadataEditorProps {
  simulation: Simulation;
  isOpen: boolean;
  onClose: () => void;
  onSave: (simulation: Simulation, metadata: SimulationMetadata) => Promise<void>;
  className?: string;
}

export default function SimulationMetadataEditor({
  simulation,
  isOpen,
  onClose,
  onSave,
  className = "",
}: SimulationMetadataEditorProps) {
  const [metadata, setMetadata] = useState<SimulationMetadata>(
    simulation.metadata || createDefaultMetadata()
  );
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or simulation changes
  useEffect(() => {
    if (isOpen) {
      setMetadata(simulation.metadata || createDefaultMetadata());
      setNewTag("");
      setError(null);
    }
  }, [isOpen, simulation]);

  const handleAddTag = () => {
    if (newTag.trim() && !metadata.tags.includes(newTag.trim())) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newTag.trim()) {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Generate comprehensive metadata including performance metrics
      const updatedMetadata = MetadataManager.generateComprehensiveMetadata(
        simulation,
        undefined, // No performance data for now
        metadata // User edits
      );

      await onSave(simulation, updatedMetadata);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save metadata");
    } finally {
      setSaving(false);
    }
  };

  const renderRatingStars = () => {
    return (
      <div className="flex items-center space-x-1">
        {Array.from({ length: 5 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setMetadata(prev => ({
              ...prev,
              rating: i + 1 === prev.rating ? undefined : i + 1,
            }))}
            className={`p-1 rounded transition-colors ${
              metadata.rating && i < metadata.rating
                ? "text-yellow-500 hover:text-yellow-600"
                : "text-gray-300 hover:text-gray-400"
            }`}
          >
            <LuStar className={`h-5 w-5 ${
              metadata.rating && i < metadata.rating ? "fill-current" : ""
            }`} />
          </button>
        ))}
        {metadata.rating && (
          <span className="ml-2 text-sm text-muted-foreground">
            ({metadata.rating}/5)
          </span>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Edit Simulation Metadata</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <LuX className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Customize metadata for "{simulation.name}"
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-base">Basic Information</h4>
            
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={metadata.category}
                onChange={(e) => setMetadata(prev => ({
                  ...prev,
                  category: e.target.value,
                }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {simulationCategories.map((category) => (
                  <option key={category} value={category} className="capitalize">
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating
              </label>
              {renderRatingStars()}
            </div>

            {/* Favorite Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="favorite"
                checked={metadata.favorite}
                onCheckedChange={(checked) => setMetadata(prev => ({
                  ...prev,
                  favorite: checked as boolean,
                }))}
              />
              <label 
                htmlFor="favorite" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
              >
                <LuHeart className="h-4 w-4 mr-2" />
                Add to favorites
              </label>
            </div>

            {/* Public Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPublic"
                checked={metadata.isPublic}
                onCheckedChange={(checked) => setMetadata(prev => ({
                  ...prev,
                  isPublic: checked as boolean,
                }))}
              />
              <label 
                htmlFor="isPublic" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
              >
                {metadata.isPublic ? (
                  <LuGlobe className="h-4 w-4 mr-2" />
                ) : (
                  <LuLock className="h-4 w-4 mr-2" />
                )}
                Make publicly viewable
              </label>
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-4">
            <h4 className="font-medium text-base">Tags</h4>
            
            {/* Add new tag */}
            <div className="flex space-x-2">
              <Input
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!newTag.trim() || metadata.tags.includes(newTag.trim())}
              >
                <LuPlus className="h-4 w-4" />
              </Button>
            </div>

            {/* Current tags */}
            {metadata.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {metadata.tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className="flex items-center space-x-1"
                  >
                    <LuTag className="h-3 w-3" />
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <LuX className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-4">
            <h4 className="font-medium text-base">Notes</h4>
            
            <Textarea
              placeholder="Add notes about this simulation..."
              value={metadata.notes}
              onChange={(e) => setMetadata(prev => ({
                ...prev,
                notes: e.target.value,
              }))}
              rows={4}
              className="resize-none"
            />
          </div>

          <Separator />

          {/* Research Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-base flex items-center">
              <LuBookOpen className="h-4 w-4 mr-2" />
              Research Information (Optional)
            </h4>
            
            {/* Hypothesis */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hypothesis
              </label>
              <Textarea
                placeholder="What hypothesis were you testing?"
                value={metadata.hypothesis || ""}
                onChange={(e) => setMetadata(prev => ({
                  ...prev,
                  hypothesis: e.target.value || undefined,
                }))}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Methodology */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Methodology
              </label>
              <Textarea
                placeholder="Describe your experimental approach..."
                value={metadata.methodology || ""}
                onChange={(e) => setMetadata(prev => ({
                  ...prev,
                  methodology: e.target.value || undefined,
                }))}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Conclusions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conclusions
              </label>
              <Textarea
                placeholder="What conclusions did you reach?"
                value={metadata.conclusions || ""}
                onChange={(e) => setMetadata(prev => ({
                  ...prev,
                  conclusions: e.target.value || undefined,
                }))}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2"
            >
              <LuSave className="h-4 w-4" />
              <span>{saving ? "Saving..." : "Save Metadata"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 