import { backendError, backendResponse } from "@/lib/backend";
import { isUuid } from "@/lib/farm-validation";

const kinds = new Set(["health", "comparison", "weather"]);

export async function GET(
  _: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await params;
  if (!kinds.has(kind) || !isUuid(id))
    return new Response("Report unavailable.", { status: 404 });
  const response = await backendResponse(`/reports/${kind}/${id}`);
  if (!(response instanceof Response))
    return new Response(response.error, { status: 503 });
  if (!response.ok)
    return new Response(await backendError(response), {
      status: response.status,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  return new Response(response.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        response.headers.get("content-disposition") ?? `attachment; filename="${kind}-report.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
