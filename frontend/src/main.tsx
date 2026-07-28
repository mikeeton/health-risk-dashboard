import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./app/App";

import "./styles/index.css";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (import.meta.env.PROD && sentryDsn && !sentryDsn.startsWith("https://")) {
  throw new Error("Production VITE_SENTRY_DSN must use HTTPS.");
}
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_RELEASE || undefined,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || "0.1"),
    sendDefaultPii: false,
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900">
          <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
            <h1 className="text-2xl font-extrabold">Something went wrong</h1>
            <p className="mt-3 text-slate-600">
              The error was recorded. Reload the page, and contact support if it continues.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
            >
              Reload application
            </button>
          </section>
        </main>
      }
    >
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
