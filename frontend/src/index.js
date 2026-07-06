import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

// NOTE: React.StrictMode is intentionally omitted here — react-leaflet 4.x
// double-initializes the Leaflet map container under StrictMode's double-invoke,
// crashing with "Map container is already initialized." This is a known
// incompatibility until react-leaflet ships a StrictMode-safe fix.
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);
