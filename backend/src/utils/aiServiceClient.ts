/**
 * AI-Service HTTP Client
 * ======================
 * Lightweight utility to forward requests from Backend to the Python
 * FastAPI AI-Service.  Uses Node.js native fetch (Node 18+).
 */

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 30_000; // 30 seconds

/**
 * Forward a JSON payload to the AI-Service and return the parsed response.
 *
 * @param path  - AI-Service endpoint path (e.g. "/optimize-route")
 * @param body  - The JSON-serializable request body
 * @returns     - Parsed JSON response from the AI-Service
 * @throws      - Error with descriptive message on failure
 */
export async function forwardToAiService(
  path: string,
  body: unknown
): Promise<unknown> {
  const url = `${AI_SERVICE_URL}${path}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      const detail =
        typeof data === "object" && data !== null && "detail" in data
          ? (data as { detail: string }).detail
          : JSON.stringify(data);

      const error = new Error(detail);
      (error as any).statusCode = response.status;
      throw error;
    }

    return data;
  } catch (err: any) {
    if (err.name === "AbortError") {
      const timeout_err = new Error(
        `AI-Service request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
      );
      (timeout_err as any).statusCode = 504;
      throw timeout_err;
    }

    // Connection refused / network error
    if (err.cause?.code === "ECONNREFUSED" || err.code === "ECONNREFUSED") {
      const conn_err = new Error(
        "AI-Service is unreachable. Ensure ai-service is running on " +
          AI_SERVICE_URL
      );
      (conn_err as any).statusCode = 502;
      throw conn_err;
    }

    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Check if the AI-Service is healthy.
 */
export async function checkAiServiceHealth(): Promise<{
  status: string;
  reachable: boolean;
}> {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5_000),
    });
    const data = (await response.json()) as { status: string };
    return { status: data.status, reachable: true };
  } catch {
    return { status: "unreachable", reachable: false };
  }
}
