import { useState } from "react";
import { usePandocPath, useCheckForUpdates, useDownloadAndInstallUpdate } from "../lib/query";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { PandocDownloadDialog } from "@/components/PandocDownloadDialog";
import { Alert, AlertTitle } from '@/components/ui/alert';
import { toast } from "sonner";

export function SettingsWindow() {
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  
  const { data: pandocPath, isLoading: pandocLoading, refetch } = usePandocPath();
  const { data: updateResult, isLoading: checkingUpdates, refetch: checkForUpdates } = useCheckForUpdates();
  const installUpdateMutation = useDownloadAndInstallUpdate();

  const handleDownloadSuccess = () => {
    setShowDownloadDialog(false);
    refetch(); // Refresh the pandoc path
  };

  const handleCheckForUpdates = async () => {
    try {
      const result = await checkForUpdates();
      if (result.data?.shouldUpdate) {
        toast.success(`Update available: v${result.data.manifest?.version}`, {
          position: "top-right",
          description: "A new version is available for download.",
        });
      } else {
        toast.success("You're up to date!", {
          position: "top-right",
          description: "No new updates available.",
        });
      }
    } catch (error) {
      console.error("Error checking for updates:", error);
      toast.error("Failed to check for updates", {
        description: error instanceof Error ? error.message : "Unknown error occurred.",
      });
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateResult?.shouldUpdate) return;
    
    const toastId = toast.loading("Downloading and installing update...", {
      position: "top-right",
      description: "This may take a few minutes.",
    });

    installUpdateMutation.mutate(undefined, {
      onSuccess: () => {
        toast.dismiss(toastId);
        toast.success("Update installed successfully!", {
          position: "top-right",
          description: "The application will restart to complete the update.",
        });
      },
      onError: (error) => {
        toast.dismiss(toastId);
        toast.error("Failed to install update", {
          position: "top-right",
          description: error instanceof Error ? error.message : "Unknown error occurred.",
        });
      },
    });
  };

  const getPandocStatus = () => {
    if (pandocPath) {
      return {
        status: "installed",
        message: "Pandoc is installed and ready to use",
        icon: <CheckCircle className="h-4 w-4 text-green-600" />
      };
    } else {
      return {
        status: "not_installed",
        message: "Pandoc is not installed. Click download to install automatically.",
        icon: <AlertCircle className="h-4 w-4 text-orange-600" />
      };
    }
  };

  const statusInfo = getPandocStatus();

  if (pandocLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <div className="flex flex-col gap-6 w-full p-6">
        <div className="w-full">
          <label className="block text-sm font-medium mb-4">
            Pandoc Configuration
          </label>
          
          <div className="space-y-4">
            {/* Status display */}
            <Alert variant={statusInfo.status === "installed" ? "default" : "destructive"}>
              <AlertTitle className="flex items-center gap-2">
                {statusInfo.icon}
                <span className="text-sm">{statusInfo.message}</span>
              </AlertTitle>
            </Alert>
            
            {/* Pandoc path display (read-only) */}
            {pandocPath && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Installation Path
                </label>
                <Input
                  type="text"
                  value={pandocPath}
                  readOnly
                  className="text-xs bg-gray-50 text-gray-600"
                />
              </div>
            )}
            
            {/* Download button */}
            <div className="flex justify-start">
              <Button 
                onClick={() => setShowDownloadDialog(true)} 
                variant={pandocPath ? "outline" : "default"}
                className="inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {pandocPath ? "Reinstall Pandoc" : "Download Pandoc"}
              </Button>
            </div>
          </div>
        </div>

        {/* App Updates Section */}
        <div className="w-full">
          <label className="block text-sm font-medium mb-4">
            App Updates
          </label>
          
          <div className="space-y-4">
            {/* Update status */}
            {updateResult?.shouldUpdate && (
              <Alert>
                <AlertTitle className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">
                    Update available: v{updateResult.manifest?.version}
                  </span>
                </AlertTitle>
              </Alert>
            )}
            
            {/* Update buttons */}
            <div className="flex justify-start gap-2">
              <Button 
                onClick={handleCheckForUpdates} 
                variant="outline"
                disabled={checkingUpdates}
                className="inline-flex items-center gap-2"
              >
                {checkingUpdates ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Check for Updates
              </Button>
              
              {updateResult?.shouldUpdate && (
                <Button 
                  onClick={handleInstallUpdate}
                  disabled={installUpdateMutation.isPending}
                  className="inline-flex items-center gap-2"
                >
                  {installUpdateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Install Update
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <PandocDownloadDialog
        isOpen={showDownloadDialog}
        onClose={() => setShowDownloadDialog(false)}
        onSuccess={handleDownloadSuccess}
      />
    </div>
  );
}
