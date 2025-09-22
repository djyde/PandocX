import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useDownloadPandoc } from "@/lib/query";
import { CheckCircle, AlertCircle, Download } from "lucide-react";

interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
  status: string;
}

interface PandocDownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pandocPath: string) => void;
}

export function PandocDownloadDialog({ isOpen, onClose, onSuccess }: PandocDownloadDialogProps) {
  const [progress, setProgress] = useState<DownloadProgress>({
    downloaded: 0,
    total: 0,
    percentage: 0,
    status: "Ready to download"
  });
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { mutate: downloadPandoc, isPending, isError, error: downloadError } = useDownloadPandoc();

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        unlisten = await listen<DownloadProgress>("download_progress", (event) => {
          const newProgress = event.payload;
          setProgress(newProgress);
          
          if (newProgress.status === "Complete!") {
            setIsComplete(true);
          }
        });
      } catch (error) {
        console.error("Failed to setup download progress listener:", error);
      }
    };

    if (isOpen) {
      setupListener();
    }

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isError && downloadError) {
      setError(downloadError.message || "Download failed");
    }
  }, [isError, downloadError]);

  const handleDownload = () => {
    setError(null);
    setIsComplete(false);
    setProgress({
      downloaded: 0,
      total: 0,
      percentage: 0,
      status: "Starting download..."
    });

    downloadPandoc(undefined, {
      onSuccess: (result) => {
        if (result.success && result.pandoc_path) {
          onSuccess(result.pandoc_path);
        } else {
          setError(result.error || "Download failed");
        }
      },
      onError: (error) => {
        setError(error.message || "Download failed");
      }
    });
  };

  const handleClose = () => {
    if (!isPending) {
      onClose();
      // Reset state when closing
      setProgress({
        downloaded: 0,
        total: 0,
        percentage: 0,
        status: "Ready to download"
      });
      setIsComplete(false);
      setError(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Pandoc
          </DialogTitle>
          <DialogDescription>
            Conversion requires Pandoc. Click the download button to automatically download and install it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          
          {isComplete && !error && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Pandoc downloaded and installed successfully!</span>
            </div>
          )}
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>{progress.status}</span>
              {progress.total > 0 && (
                <span>{formatBytes(progress.downloaded)} / {formatBytes(progress.total)}</span>
              )}
            </div>
            
            <Progress 
              value={progress.percentage} 
              className="w-full"
            />
            
            {progress.percentage > 0 && (
              <div className="text-center text-sm text-gray-500">
                {progress.percentage.toFixed(1)}%
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isPending}
            >
              {isComplete ? "Close" : "Cancel"}
            </Button>
            
            {!isComplete && !isPending && (
              <Button 
                onClick={handleDownload}
                disabled={isPending}
              >
                {isPending ? "Downloading..." : "Download Pandoc"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
