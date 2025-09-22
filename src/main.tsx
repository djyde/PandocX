import React from "react";
import ReactDOM from "react-dom/client";
import { MainWindow } from "./windows/Main";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query";
import { Provider as JotaiProvider } from "jotai";
import "./tw.css";
import { store } from "./lib/store";
import { Toaster } from "@/components/ui/sonner"


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <JotaiProvider store={store}>
        <MainWindow />
        <Toaster />
      </JotaiProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
