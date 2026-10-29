/**
 * Safe API client helper.
 * Ensures consistent JSON responses, handles errors gracefully, and prevents
 * "<!doctype" JSON parse crashes and unhandled "Failed to fetch" exceptions.
 */

export async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  try {
    const res = await fetch(cleanEndpoint, options);
    const contentType = res.headers.get("content-type") || "";

    // If response is JSON, return directly
    if (contentType.includes("application/json")) {
      return res;
    }

    // If server returned HTML (SPA fallback), return a safe JSON response
    if (contentType.includes("text/html")) {
      console.warn(`Endpoint ${cleanEndpoint} returned HTML instead of JSON.`);
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Server mengembalikan respon HTML (halaman web). Pastikan fungsi API serverless di Vercel telah aktif."
        }),
        {
          status: res.status >= 400 ? res.status : 502,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return res;
  } catch (err: any) {
    console.warn(`Fetch call to ${cleanEndpoint} failed:`, err);
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Koneksi ke server proxy AI terputus. Pastikan koneksi internet stabil."
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
