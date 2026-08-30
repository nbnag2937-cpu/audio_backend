const ALLOWED_HOSTS = ["shopee.vn", "s.shopee.vn", "shp.ee"];

function isAllowedShopeeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_HOSTS.some(
      (host) =>
        parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

export async function fetchOgImage(targetUrl: string): Promise<{
  imageUrl: string | null;
  resolvedUrl: string;
}> {
  if (!isAllowedShopeeUrl(targetUrl)) {
    throw new Error("URL không hợp lệ, chỉ chấp nhận link Shopee");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(targetUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "vi-VN,vi;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      return { imageUrl: null, resolvedUrl: res.url };
    }

    const html = await res.text();

    const match =
      html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      );

    return { imageUrl: match?.[1] ?? null, resolvedUrl: res.url };
  } finally {
    clearTimeout(timeout);
  }
}
