import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query";
import { SettingsWindow } from "./windows/Settings";
import "./tw.css";
import { Toaster } from "./components/ui/sonner";

ReactDOM.createRoot(document.getElementById("settings-root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SettingsWindow />
      <Toaster />
    </QueryClientProvider>
  </React.StrictMode>
);
