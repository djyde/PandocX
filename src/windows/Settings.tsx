import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  useSettings, 
  useSaveSettings, 
  usePandocValidation, 
  useValidatePandocPath 
} from "../lib/query";

export function SettingsWindow() {
  const [pandocPath, setPandocPath] = useState("");
  const [shouldValidate, setShouldValidate] = useState(false);

  // React Query hooks
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useSettings();
  const { mutate: saveSettings, isPending: isSaving } = useSaveSettings();
  const { mutate: validatePath, isPending: isManuallyChecking } = useValidatePandocPath();
  
  // Auto-validation query (only runs when shouldValidate is true and path exists)
  const { 
    data: isValidPath, 
    isLoading: isAutoValidating, 
    error: validationError 
  } = usePandocValidation(shouldValidate ? pandocPath : "");

  // Update local state when settings are loaded
  useEffect(() => {
    if (settings?.pandocPath) {
      setPandocPath(settings.pandocPath);
      setShouldValidate(true); // Enable auto-validation for loaded path
    }
  }, [settings]);

  const handlePathChange = (value: string) => {
    setPandocPath(value);
    setShouldValidate(false); // Disable auto-validation when user is typing
  };

  const handleCheckPath = () => {
    if (pandocPath.trim()) {
      validatePath(pandocPath);
      setShouldValidate(true); // Enable auto-validation after manual check
    }
  };

  const handleSave = () => {
    saveSettings({ pandocPath });
    setShouldValidate(true); // Enable auto-validation after saving
  };

  const handleClose = async () => {
    try {
      await invoke("close_settings_window");
    } catch (error) {
      console.error("Failed to close settings window:", error);
    }
  };

  const getStatusColor = () => {
    if (validationError) return "text-red-600";
    if (isValidPath === true) return "text-green-600";
    if (isValidPath === false) return "text-red-600";
    return "text-gray-500";
  };

  const getStatusText = () => {
    if (isManuallyChecking || isAutoValidating) return "Checking...";
    if (validationError) return "✗ Failed to check pandoc path";
    if (isValidPath === true) return "✓ Valid pandoc installation";
    if (isValidPath === false) return "✗ Invalid pandoc path";
    return "Enter pandoc path and click 'Check Path'";
  };

  // Show loading state while settings are being loaded
  if (settingsLoading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6 w-48"></div>
          <div className="bg-white rounded-lg shadow p-6 w-96">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-10 bg-gray-200 rounded mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if settings failed to load
  if (settingsError) {
    console.error("Settings error:", settingsError);
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 max-w-md">
          <h3 className="text-sm font-medium text-red-800">Error Loading Settings</h3>
          <p className="text-sm text-red-700 mt-1">
            Failed to load settings. Please try refreshing the window.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-2">
              <summary className="text-xs text-red-600 cursor-pointer">Debug Info</summary>
              <pre className="text-xs text-red-600 mt-1 whitespace-pre-wrap">
                {settingsError instanceof Error ? settingsError.message : String(settingsError)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="bg-white rounded-lg shadow p-6 max-w-lg mx-auto">
          <div className="space-y-6">
            <div>
              <label htmlFor="pandoc-path" className="block text-sm font-medium text-gray-700 mb-2">
                Pandoc Path
              </label>
              <div className="space-y-3">
                <input
                  id="pandoc-path"
                  type="text"
                  value={pandocPath}
                  onChange={(e) => handlePathChange(e.target.value)}
                  placeholder="/usr/local/bin/pandoc or /opt/homebrew/bin/pandoc"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleCheckPath}
                    disabled={isManuallyChecking || isAutoValidating || !pandocPath.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isManuallyChecking || isAutoValidating ? "Checking..." : "Check Path"}
                  </button>
                  
                  <span className={`text-sm ${getStatusColor()}`}>
                    {getStatusText()}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">How to find your pandoc path:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• If installed via Homebrew: <code className="bg-blue-100 px-1 rounded">/opt/homebrew/bin/pandoc</code></li>
                <li>• If installed via official installer: <code className="bg-blue-100 px-1 rounded">/usr/local/bin/pandoc</code></li>
                <li>• Run <code className="bg-blue-100 px-1 rounded">which pandoc</code> in Terminal to find the exact path</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
