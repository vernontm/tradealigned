/**
 * Server-side proxy that takes a URL and returns the image bytes.
 *
 * Handles:
 *   - direct image URLs (png/jpg/jpeg/webp/gif)
 *   - tradingview.com/x/<id>/ snapshot pages (extracts og:image)
 *   - any HTML page with an og:image meta tag
 *
 * Returns: { dataUrl, mediaType }
 */

const IMG_EXT = /\.(png|jpe?g|webp|gif)(\?|$)/i;

async function resolveImageUrl(input: string): Promise<{ url: string; mediaType: string }> {
  const u = new URL(input);

  // Direct image URL
  if (IMG_EXT.test(u.pathname)) {
    const ext = u.pathname.toLowerCase().match(IMG_EXT)?.[1] ?? "png";
    const mediaType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    return { url: u.toString(), mediaType };
  }

  // Fetch HTML and extract og:image
  const resp = await fetch(u.toString(), {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    },
  });
  if (!resp.ok) {
    throw new Error(`fetch ${u.toString()} -> ${resp.status}`);
  }
  const html = await resp.text();
  const og =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] ??
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1];

  if (!og) throw new Error("no og:image on the page");
  const resolved = new URL(og, u.toString()).toString();
  const ext = resolved.toLowerCase().match(IMG_EXT)?.[1] ?? "png";
  const mediaType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  return { url: resolved, mediaType };
}

export async function POST(req: Request) {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url) return Response.json({ error: "no url" }, { status: 400 });

    const { url: imgUrl, mediaType } = await resolveImageUrl(url);
    const imgResp = await fetch(imgUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    if (!imgResp.ok) {
      return Response.json(
        { error: `image fetch ${imgUrl} -> ${imgResp.status}` },
        { status: 502 }
      );
    }
    const buf = await imgResp.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    return Response.json({
      dataUrl: `data:${mediaType};base64,${base64}`,
      mediaType,
      size: buf.byteLength,
      sourceUrl: imgUrl,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 400 });
  }
}
