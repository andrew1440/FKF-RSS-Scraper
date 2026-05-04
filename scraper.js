/**
 * FKF News RSS Scraper
 * Fetches https://footballkenya.org/news (React SPA → needs Puppeteer),
 * extracts article titles, URLs and dates, then writes fkf-news.xml.
 *
 * Usage:  node scraper.js
 * Cron:   0 * * * * node /path/to/scraper.js   (every hour)
 */

const puppeteer = require("puppeteer");
const RSS = require("rss");
const fs = require("fs");
const path = require("path");

const TARGET_URL = "https://footballkenya.org/news";
const OUTPUT_FILE = path.join(__dirname, "fkf-news.xml");
const MAX_ARTICLES = 20;

async function scrape() {
  console.log(`[${new Date().toISOString()}] Launching browser…`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  try {
    console.log(`Navigating to ${TARGET_URL}…`);
    await page.goto(TARGET_URL, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait for at least one news card / article link to appear
    await page
      .waitForSelector("a[href*='/news/']", { timeout: 15000 })
      .catch(() => console.warn("Selector timeout – trying anyway…"));

    // Dump the rendered HTML for inspection if needed
    // fs.writeFileSync("debug.html", await page.content());

    const articles = await page.evaluate((max) => {
      const results = [];
      const seen = new Set();

      /**
       * Convert a URL slug to a readable title.
       * e.g. "coach-cheche-names-provisional-squad-as-junior-starlets-eye-uganda"
       *   → "Coach Cheche Names Provisional Squad As Junior Starlets Eye Uganda"
       */
      function slugToTitle(url) {
        try {
          const slug = new URL(url).pathname
            .split("/")
            .filter(Boolean)
            .pop() || "";
          return slug
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
        } catch {
          return null;
        }
      }

      /**
       * Resolve a title from the DOM element hierarchy.
       * Prefers explicit headings, then aria-label, then slug.
       */
      function resolveTitle(a, parent, url) {
        const heading = parent?.querySelector("h1,h2,h3,h4,h5");
        const headingText = heading?.textContent?.trim();
        // Skip generic site-name headings
        if (headingText && headingText.toLowerCase() !== "football kenya federation") {
          return headingText;
        }
        const ariaLabel = a.getAttribute("aria-label")?.trim();
        if (ariaLabel && ariaLabel.toLowerCase() !== "football kenya federation") {
          return ariaLabel;
        }
        const aText = a.textContent?.trim();
        if (aText && aText.toLowerCase() !== "football kenya federation" && aText.length > 10) {
          return aText;
        }
        // Fall back to slug-derived title
        return slugToTitle(url) || "FKF News";
      }

      /**
       * Pick the best image from a parent container.
       * Skips the logo (fkf-logo) and favicon-style images.
       */
      function resolveImage(parent) {
        if (!parent) return null;
        const imgs = Array.from(parent.querySelectorAll("img"));
        const article = imgs.find(
          (img) =>
            img.src &&
            !img.src.includes("fkf-logo") &&
            !img.src.includes("favicon") &&
            img.naturalWidth > 80
        );
        return article?.src || imgs[0]?.src || null;
      }

      // Strategy 1: explicit <article> tags
      document.querySelectorAll("article").forEach((el) => {
        const a = el.querySelector("a[href]");
        const timeEl = el.querySelector("time");
        if (!a) return;
        const url = a.href;
        if (seen.has(url) || !url.includes("/news/")) return;
        seen.add(url);
        results.push({
          title: resolveTitle(a, el, url),
          url,
          date: timeEl?.getAttribute("datetime") || timeEl?.textContent?.trim() || null,
          image: resolveImage(el),
        });
      });

      // Strategy 2: anchor[href*='/news/'] card layout
      document.querySelectorAll("a[href*='/news/']").forEach((a) => {
        const url = a.href;
        if (seen.has(url)) return;
        seen.add(url);

        // Walk up max 7 levels to find a card container
        let parent = a.parentElement;
        for (let i = 0; i < 6; i++) {
          if (!parent) break;
          parent = parent.parentElement;
        }

        const timeEl = parent?.querySelector("time");

        results.push({
          title: resolveTitle(a, parent, url),
          url,
          date: timeEl?.getAttribute("datetime") || timeEl?.textContent?.trim() || null,
          image: resolveImage(parent),
        });
      });

      return results.slice(0, max);
    }, MAX_ARTICLES);

    console.log(`Extracted ${articles.length} articles.`);
    if (articles.length === 0) {
      console.warn(
        "No articles found. The page structure may have changed. " +
          "Run with headless:false to debug."
      );
    }

    // Build RSS feed
    const feed = new RSS({
      title: "Football Kenya Federation – Latest News",
      description:
        "Auto-generated RSS feed of the latest news from footballkenya.org",
      feed_url: "https://yourdomain.com/rss/fkf-news.xml", // ← update this
      site_url: "https://footballkenya.org",
      image_url: "https://footballkenya.org/favicon.png",
      language: "en",
      ttl: 60, // cache for 60 minutes
      pubDate: new Date(),
    });

    for (const article of articles) {
      feed.item({
        title: article.title,
        url: article.url,
        date: article.date ? new Date(article.date) : new Date(),
        description: article.image
          ? `<img src="${article.image}" alt="${article.title}" />`
          : article.title,
        enclosure: article.image
          ? { url: article.image, type: "image/jpeg" }
          : undefined,
      });
    }

    const xml = feed.xml({ indent: true });
    fs.writeFileSync(OUTPUT_FILE, xml, "utf8");
    console.log(`✅ RSS feed written to ${OUTPUT_FILE}`);
    console.log(
      `   Contains ${articles.length} items. Upload this file to your static host.`
    );
  } finally {
    await browser.close();
  }
}

scrape().catch((err) => {
  console.error("Scraper failed:", err.message);
  process.exit(1);
});
