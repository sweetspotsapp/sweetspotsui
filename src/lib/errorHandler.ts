import { toast } from "sonner";

/**
 * Classify errors into user-friendly categories
 */
type ErrorCategory = "network" | "auth" | "validation" | "not_found" | "rate_limit" | "server" | "unknown";

function classifyError(error: unknown): { category: ErrorCategory; message: string } {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return { category: "network", message: "You seem to be offline. Check your connection and try again." };
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (msg.includes("jwt") || msg.includes("auth") || msg.includes("not authenticated") || msg.includes("session")) {
      return { category: "auth", message: "Your session has expired. Please sign in again." };
    }
    if (msg.includes("rate limit") || msg.includes("429") || msg.includes("too many")) {
      return { category: "rate_limit", message: "Too many requests. Please wait a moment and try again." };
    }
    if (msg.includes("not found") || msg.includes("404")) {
      return { category: "not_found", message: "The requested resource was not found." };
    }
    if (msg.includes("validation") || msg.includes("invalid")) {
      return { category: "validation", message: error.message };
    }
    if (msg.includes("500") || msg.includes("internal server")) {
      return { category: "server", message: "Something went wrong on our end. Please try again." };
    }

    return { category: "unknown", message: error.message };
  }

  // Supabase error object
  if (typeof error === "object" && error !== null && "message" in error) {
    const supaError = error as { message: string; code?: string };
    if (supaError.code === "PGRST116") {
      return { category: "not_found", message: "No data found." };
    }
    return { category: "unknown", message: supaError.message };
  }

  return { category: "unknown", message: "An unexpected error occurred." };
}

/**
 * Show a standardized error toast with optional retry
 */
export function showErrorToast(
  error: unknown,
  context?: string,
  onRetry?: () => void
) {
  const { category, message } = classifyError(error);

  const title = context ? `${context} failed` : getCategoryTitle(category);

  if (onRetry) {
    toast.error(title, {
      description: message,
      action: {
        label: "Retry",
        onClick: onRetry,
      },
      duration: 6000,
    });
  } else {
    toast.error(title, {
      description: message,
      duration: 5000,
    });
  }

  // Always log for debugging
  console.error(`[${category}] ${context || "Error"}:`, error);
}

function getCategoryTitle(category: ErrorCategory): string {
  switch (category) {
    case "network": return "Connection issue";
    case "auth": return "Authentication required";
    case "validation": return "Invalid input";
    case "not_found": return "Not found";
    case "rate_limit": return "Slow down";
    case "server": return "Server error";
    default: return "Something went wrong";
  }
}

/**
 * Show a standardized success toast
 */
export function showSuccessToast(title: string, description?: string) {
  toast.success(title, {
    description,
    duration: 3000,
  });
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelay = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}
