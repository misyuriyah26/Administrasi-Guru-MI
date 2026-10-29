/**
 * API client helper with automatic failover to the Cloud Run server backend.
 * Ensures that if the app is hosted on static Vercel (where /api/* might return index.html),
 * it seamlessly routes to the live backend proxy without throwing '<!doctype' JSON parse errors.
 */

export const BACKEND_URL = "https://ais-dev-tz7h75ytflblzbpkarikdx-244981330356.asia-southeast1.run.app";

export async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // If already running directly on the backend URL or relative localhost
  try {
    const res = await fetch(cleanEndpoint, options);
    const contentType = res.headers.get("content-type") || "";

    // If response is valid JSON, return it directly
    if (res.ok && contentType.includes("application/json")) {
      return res;
    }

    // If Vercel or static host returned HTML (index.html) or 404, fallback to live Cloud Run backend
    if (!res.ok || contentType.includes("text/html")) {
      console.warn(`Endpoint ${cleanEndpoint} returned HTML/non-JSON (${res.status} ${contentType}). Routing to live backend ${BACKEND_URL}...`);
      const backendUrl = `${BACKEND_URL}${cleanEndpoint}`;
      const backendRes = await fetch(backendUrl, options);
      return backendRes;
    }

    return res;
  } catch (err) {
    console.warn(`Local fetch to ${cleanEndpoint} failed, routing to live backend ${BACKEND_URL}:`, err);
    const backendUrl = `${BACKEND_URL}${cleanEndpoint}`;
    return fetch(backendUrl, options);
  }
}
