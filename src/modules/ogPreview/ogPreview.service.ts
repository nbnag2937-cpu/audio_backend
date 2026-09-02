/// <reference lib="dom" />

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

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

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
    await page.setExtraHTTPHeaders({ "Accept-Language": "vi-VN,vi;q=0.9" });
    await page.setViewport({ width: 1366, height: 768 });

    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 20000 });

    const resolvedUrl = page.url();

    const imageUrl = await page.evaluate(() => {
      const meta = (globalThis as any).document.querySelector(
        'meta[property="og:image"]',
      );
      return meta ? meta.getAttribute("content") : null;
    });

    return { imageUrl, resolvedUrl };
  } finally {
    await browser.close();
  }
}
