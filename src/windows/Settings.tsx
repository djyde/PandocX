import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useSettings, useSaveSettings } from "../lib/query";
import { Button } from "@/components/ui/button";
import { FolderOpenIcon } from 'lucide-react';
import { Input } from "@/components/ui/input";

export function SettingsWindow() {
  const [pandocPath, setPandocPath] = useState("");

  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { mutate: saveSettings } = useSaveSettings();

  // Update local state when settings are loaded
  useEffect(() => {
    if (settings?.pandocPath) {
      setPandocPath(settings.pandocPath);
    }
  }, [settings]);

  const handleFileSelect = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        // No filters to allow selecting any file, including executables without extensions
      });

      if (selected && typeof selected === "string") {
        setPandocPath(selected);
        // Auto-save when file is selected
        saveSettings({ pandocPath: selected });
      }
    } catch (error) {
      console.error("Failed to select file:", error);
    }
  };

  const handlePathChange = (value: string) => {
    setPandocPath(value);
    // Auto-save on change with debounce could be added here if needed
    saveSettings({ pandocPath: value });
  };

  if (settingsLoading) {
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
      <div className="flex flex-col gap-4 w-full p-6">
        <div className="w-full">
          <label className="block text-sm font-medium mb-2">
            Pandoc Path
          </label>
          <div className="flex gap-2 items-center w-full">
            <Input
              type="text"
              value={pandocPath}
              onChange={(e) => handlePathChange(e.target.value)}
              placeholder="/usr/local/bin/pandoc"
              className="text-xs w-full"
            />
            <Button onClick={handleFileSelect} variant="outline">
              <FolderOpenIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
