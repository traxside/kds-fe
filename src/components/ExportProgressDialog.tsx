"use client";

import React, { useState, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  LuDownload, 
  LuX, 
  LuCheck, 
  LuTriangleAlert,
  LuRefreshCw 
} from "react-icons/lu";
import { ExportProgressCallback } from "@/lib/exportUtils";

interface ExportProgressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  allowCancel?: boolean;
}

export interface ExportProgressController {
  startExport: (exportFunction: (onProgress: ExportProgressCallback) => Promise<void>) => Promise<void>;
  reset: () => void;
}

const ExportProgressDialog = forwardRef<ExportProgressController, ExportProgressDialogProps>(({
  isOpen,
  onClose,
  title = "Exporting Data",
  allowCancel = true,
}, ref) => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const handleProgress: ExportProgressCallback = useCallback((progressValue, statusMessage) => {
    setProgress(progressValue);
    if (statusMessage) {
      setMessage(statusMessage);
    }
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setMessage("");
    setIsExporting(false);
    setIsComplete(false);
    setError(null);
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  }, [abortController]);

  const startExport = useCallback(async (
    exportFunction: (onProgress: ExportProgressCallback) => Promise<void>
  ) => {
    reset();
    setIsExporting(true);
    setMessage("Initializing export...");

    const controller = new AbortController();
    setAbortController(controller);

    try {
      await exportFunction(handleProgress);
      
      if (!controller.signal.aborted) {
        setIsComplete(true);
        setIsExporting(false);
        setMessage("Export completed successfully!");
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const errorMessage = err instanceof Error ? err.message : "Export failed";
        setError(errorMessage);
        setIsExporting(false);
        setMessage("Export failed");
      }
    }
  }, [handleProgress, reset]);

  const handleCancel = useCallback(() => {
    if (abortController && !abortController.signal.aborted) {
      abortController.abort();
      setIsExporting(false);
      setMessage("Export cancelled");
    }
  }, [abortController]);

  const handleClose = useCallback(() => {
    if (isExporting && allowCancel) {
      handleCancel();
    }
    reset();
    onClose();
  }, [isExporting, allowCancel, handleCancel, reset, onClose]);

  const getStatusIcon = () => {
    if (error) return <LuTriangleAlert className="h-5 w-5 text-red-500" />;
    if (isComplete) return <LuCheck className="h-5 w-5 text-green-500" />;
    if (isExporting) return <LuRefreshCw className="h-5 w-5 animate-spin text-blue-500" />;
    return <LuDownload className="h-5 w-5 text-gray-500" />;
  };

  // Expose controller methods via ref
  useImperativeHandle(ref, () => ({
    startExport,
    reset,
  }), [startExport, reset]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {getStatusIcon()}
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          {/* Status Message */}
          {message && (
            <div className="text-sm text-muted-foreground">
              {message}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <LuTriangleAlert className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {isComplete && !error && (
            <Alert>
              <LuCheck className="h-4 w-4" />
              <AlertDescription>
                Export completed successfully! Your file has been downloaded.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            {isExporting && allowCancel && (
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex items-center space-x-2"
              >
                <LuX className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
            )}
            
            {(!isExporting || !allowCancel) && (
              <Button
                variant={isComplete ? "default" : "outline"}
                onClick={handleClose}
                className="flex items-center space-x-2"
              >
                <span>{isComplete ? "Done" : "Close"}</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

ExportProgressDialog.displayName = "ExportProgressDialog";

export default ExportProgressDialog; 