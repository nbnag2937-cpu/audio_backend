// ogPreview.service.ts

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

function extractShopAndItemId(
  url: string,
): { shopId: string; itemId: string } | null {
  // Dạng: shopee.vn/xxx-i.SHOPID.ITEMID
  let m = url.match(/i\.(\d+)\.(\d+)/);
  if (m) return { shopId: m[1], itemId: m[2] };

  // Dạng: shopee.vn/product/SHOPID/ITEMID  hoặc  shopee.vn/xxx/SHOPID/ITEMID
  m = url.match(/shopee\.vn\/[^/?#]+\/(\d+)\/(\d+)/);
  if (m) return { shopId: m[1], itemId: m[2] };

  // Dạng query: ?itemid=xxx&shopid=xxx
  const itemMatch = url.match(/item_?id=(\d+)/i);
  const shopMatch = url.match(/shop_?id=(\d+)/i);
  if (itemMatch && shopMatch) {
    return { shopId: shopMatch[1], itemId: itemMatch[1] };
  }

  return null;
}

export async function fetchOgImage(targetUrl: string): Promise<{
  imageUrl: string | null;
  resolvedUrl: string;
}> {
  if (!isAllowedShopeeUrl(targetUrl)) {
    throw new Error("URL không hợp lệ, chỉ chấp nhận link Shopee");
  }

  // Bước 1: resolve link rút gọn -> URL đích
  const resolveRes = await fetch(targetUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  const resolvedUrl = resolveRes.url;

  // Bước 2: tách shop_id, item_id
  const ids = extractShopAndItemId(resolvedUrl);
  if (!ids) {
    return { imageUrl: null, resolvedUrl };
  }

  // Bước 3: gọi thẳng API sản phẩm Shopee
  const apiUrl = `https://shopee.vn/api/v4/item/get?itemid=${ids.itemId}&shopid=${ids.shopId}`;
  const apiRes = await fetch(apiUrl, {
    signal: AbortSignal.timeout(8000),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://shopee.vn/",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!apiRes.ok) {
    return { imageUrl: null, resolvedUrl };
  }

  const data = (await apiRes.json()) as {
    data?: {
      image?: string;
    };
  };

  const imageHash: string | undefined = data?.data?.image;

  const imageUrl = imageHash
    ? `https://down-vn.img.susercontent.com/file/${imageHash}`
    : null;

  return { imageUrl, resolvedUrl };
}
