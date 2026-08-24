/**
 * AI-Service HTTP Client
 * ======================
 * Lightweight utility to forward requests from Backend to the Python
 * FastAPI AI-Service.  Uses Node.js native fetch (Node 18+).
 */
/**
 * Forward a JSON payload to the AI-Service and return the parsed response.
 *
 * @param path  - AI-Service endpoint path (e.g. "/optimize-route")
 * @param body  - The JSON-serializable request body
 * @returns     - Parsed JSON response from the AI-Service
 * @throws      - Error with descriptive message on failure
 */
export declare function forwardToAiService(path: string, body: unknown): Promise<unknown>;
/**
 * Check if the AI-Service is healthy.
 */
export declare function checkAiServiceHealth(): Promise<{
    status: string;
    reachable: boolean;
}>;
//# sourceMappingURL=aiServiceClient.d.ts.map