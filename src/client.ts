import OpenAI from "openai";

let _client: OpenAI | null = null;

/**
 * Get or create the OpenAI client singleton.
 * Uses OPENAI_API_KEY and optionally OPENAI_API_BASE from environment.
 */
export function getClient(): OpenAI {
  if (_client) return _client;

  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is required. " +
        "Set it to your OpenAI API key before starting the server."
    );
  }

  const baseURL = process.env["OPENAI_API_BASE"];

  _client = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  return _client;
}

/**
 * Reset the singleton (for testing or re-configuration).
 */
export function resetClient(): void {
  _client = null;
}
