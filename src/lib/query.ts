import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { load } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";

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

export const getSettings = async () => {
  try {
    console.log("Getting settings...");
    const store = await getStore();
    console.log("Store loaded successfully");
    const pandocPath = await store.get<string>("pandoc_path");
    console.log("Pandoc path retrieved:", pandocPath);
    return {
      pandocPath: pandocPath || "",
    };
  } catch (error) {
    console.error("Error getting settings:", error);
    throw error;
  }
};

export const saveSettings = async (settings: { pandocPath: string }) => {
  const store = await getStore();
  await store.set("pandoc_path", settings.pandocPath);
  await store.save();
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