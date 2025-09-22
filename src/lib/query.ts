import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { load } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";
import { Update } from "@tauri-apps/plugin-updater";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tauri apps don't need to refetch on window focus since they're desktop apps
      refetchOnWindowFocus: false,
      // Keep data fresh for longer since we're not dealing with server data that changes frequently
      // staleTime: 5 * 60 * 1000, // 5 minutes
      // Retry failed queries once (useful for intermittent Tauri command failures)
      retry: 1,
      // Keep unused data in cache for longer
      // gcTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      // Retry failed mutations once
    },
  },
});

// Store instance (lazy loaded)
let store: Awaited<ReturnType<typeof load>> | null = null;

// Store operations
export const getStore = async () => {
  try {
    if (!store) {
      console.log("Loading store for the first time...");
      store = await load("settings.json", { autoSave: false, defaults: {} });
      console.log("Store loaded and initialized");
    }
    return store;
  } catch (error) {
    console.error("Error loading store:", error);
    throw error;
  }
};

export const getPandocPath = async (): Promise<string | null> => {
  try {
    return await invoke<string | null>("get_pandoc_path");
  } catch (error) {
    console.error("Error getting pandoc path:", error);
    return null;
  }
};

export const getSettings = async () => {
  try {
    const pandocPath = await getPandocPath();
    return {
      pandocPath: pandocPath || "",
    };
  } catch (error) {
    console.error("Error getting settings:", error);
    throw error;
  }
};

export const saveSettings = async (settings: { pandocPath: string }) => {
  // We no longer save pandoc path to store since it's auto-downloaded
  return settings;
};

export const checkPandocPath = async (pandocPath: string): Promise<boolean> => {
  if (!pandocPath.trim()) {
    return false;
  }
  return await invoke<boolean>("check_pandoc_path", { pandocPath });
};

// React Query hooks
export const useSettings = () => {
  return useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
};

export const useSaveSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
      queryClient.invalidateQueries({ queryKey: ["pandoc-validation"] });
    },
  });
};

export const usePandocValidation = (pandocPath: string) => {
  return useQuery({
    queryKey: ["pandoc-validation", pandocPath],
    queryFn: () => checkPandocPath(pandocPath),
    enabled: !!pandocPath.trim(),
    retry: 1,
  });
};

export const useValidatePandocPath = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: checkPandocPath,
    onSuccess: (isValid, pandocPath) => {
      queryClient.setQueryData(["pandoc-validation", pandocPath], isValid);
    },
  });
};

// Document conversion
interface ConversionParams {
  pandocPath: string;
  inputPath: string;
  outputFormat: string;
  [key: string]: unknown;
}

interface ConversionResult {
  success: boolean;
  output_path?: string;
  error?: string;
}

export const convertDocument = async (params: ConversionParams): Promise<ConversionResult> => {
  return await invoke<ConversionResult>("convert_document", params);
};

export const useConvertDocument = () => {
  return useMutation({
    mutationFn: convertDocument,
  });
};

// Pandoc download functionality
interface PandocDownloadResult {
  success: boolean;
  pandoc_path?: string;
  error?: string;
}

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
  status: string;
}

export const downloadPandoc = async (): Promise<PandocDownloadResult> => {
  return await invoke<PandocDownloadResult>("check_or_download_pandoc");
};

export const useDownloadPandoc = () => {
  return useMutation({
    mutationFn: downloadPandoc,
  });
};

export const usePandocPath = () => {
  return useQuery({
    queryKey: ["pandoc-path"],
    queryFn: getPandocPath,
  });
};

// Updater functionality
export interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
  currentVersion: string;
}

export interface UpdateResult {
  shouldUpdate: boolean;
  manifest?: UpdateInfo;
}

export const checkForUpdates = async (): Promise<UpdateResult> => {
  try {
    const update = await check();

    if (update) {
      return {
        shouldUpdate: true,
        manifest: {
          version: update.version,
          date: update.date,
          body: update.body,
          currentVersion: update.currentVersion,
        },
      };
    } else {
      return {
        shouldUpdate: false,
      };
    }
  } catch (error) {
    console.error("Error checking for updates:", error);
    throw error;
  }
};

export const downloadAndInstallUpdate = async (): Promise<void> => {
  try {
    const update = await check();

    if (update) {
      await update.downloadAndInstall();
    } else {
      throw new Error("No update available");
    }
  } catch (error) {
    console.error("Error downloading and installing update:", error);
    throw error;
  }
};

export const useCheckForUpdates = () => {
  return useQuery({
    queryKey: ["check-updates"],
    queryFn: checkForUpdates,
    // Check for updates every 30 minutes when app is active
    refetchInterval: 30 * 60 * 1000,
    // Don't check immediately on mount, let user trigger manually first
    enabled: false,
  });
};

export const useDownloadAndInstallUpdate = () => {
  return useMutation({
    mutationFn: downloadAndInstallUpdate,
  });
};

// Auto check for updates (can be enabled/disabled)
export const useAutoCheckForUpdates = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["auto-check-updates"],
    queryFn: checkForUpdates,
    refetchInterval: enabled ? 60 * 60 * 1000 : false, // Check every hour when enabled
    retry: false, // Don't retry failed auto-checks
    refetchOnWindowFocus: false,
  });
};