// ============================================
// Maate Web — Logger Utility
// Standardized client-side logging with Sentry integration
// ============================================

import * as Sentry from "@sentry/nextjs";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  message: string;
  context?: Record<string, any>;
  error?: Error | unknown;
}

class Logger {
  private isProduction = process.env.NODE_ENV === "production";

  private log(level: LogLevel, payload: LogPayload) {
    const { message, context, error } = payload;
    const timestamp = new Date().toISOString();

    // 1. Console Logging (Cleaned up for Dev)
    if (!this.isProduction || level === "error") {
      const consoleMethod = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
      consoleMethod(`[${timestamp}] [${level.toUpperCase()}] ${message}`, context || "", error || "");
    }

    // 2. Production Observability (Sentry)
    if (this.isProduction) {
      if (level === "error") {
        Sentry.withScope((scope) => {
          if (context) scope.setExtras(context);
          if (error instanceof Error) {
            Sentry.captureException(error);
          } else {
            Sentry.captureMessage(message, "error");
          }
        });
      } else if (level === "warn") {
        Sentry.withScope((scope) => {
          if (context) scope.setExtras(context);
          Sentry.captureMessage(message, "warning");
        });
      }
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log("debug", { message, context });
  }

  info(message: string, context?: Record<string, any>) {
    this.log("info", { message, context });
  }

  warn(message: string, context?: Record<string, any>) {
    this.log("warn", { message, context });
  }

  error(message: string, error?: Error | unknown, context?: Record<string, any>) {
    this.log("error", { message, error, context });
  }
}

export const logger = new Logger();
