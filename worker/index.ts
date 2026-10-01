import { handleApi } from "./api";

export default {
  fetch(request) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, { delayMs: 300 });
    }
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
