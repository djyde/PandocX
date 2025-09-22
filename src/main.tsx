import React from "react";
import ReactDOM from "react-dom/client";
import { MainWindow } from "./windows/Main";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query";
import { Provider as JotaiProvider } from "jotai";
import "./tw.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <JotaiProvider>
        <MainWindow />
      </JotaiProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
