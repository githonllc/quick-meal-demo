import { handleApi } from "./api";

export default {
  fetch(request) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      // Raise this to see the loading states in a demo.
      return handleApi(request, { delayMs: 0 });
    }
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
