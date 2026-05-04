# FKF News RSS Scraper

🏈 **Automatically convert FKF (Football Kenya Federation) news into an RSS feed.**

This tool scrapes the [Football Kenya Federation news page](https://footballkenya.org/news) and generates a standards-compliant RSS 2.0 feed that you can subscribe to in your favorite RSS reader.

## Why?

The FKF news website is a React Single Page Application (SPA), meaning content is dynamically loaded with JavaScript. This scraper uses **Puppeteer** (headless Chromium) to fully render the page before extracting articles, ensuring you capture all the latest FKF news.

## Features

- ✅ Full-page rendering with Puppeteer for dynamic content
- ✅ Generates valid RSS 2.0 XML feed
- ✅ Extracts article titles, descriptions, links, and dates
- ✅ Can be automated with cron jobs or Windows Task Scheduler
- ✅ Multiple hosting options (GitHub Pages, AWS S3, self-hosted)

---

## Quick Start

### Prerequisites
- Node.js 14+ installed
- npm or yarn

### Installation & Usage

```bash
# Clone and install dependencies
git clone https://github.com/andrew1440/FKF-RSS-Scraper.git
cd FKF-RSS-Scraper
npm install

# Run the scraper
node scraper.js
```

This generates `fkf-news.xml` in your project directory.

---

## Deployment Options

### Option 1: GitHub Pages (Recommended for most users)

Free and simple hosting directly from your GitHub repository.

1. **Create a new public repository** (e.g., `yourname/fkf-feed`)
2. **Clone and run the scraper:**
   ```bash
   git clone https://github.com/andrew1440/FKF-RSS-Scraper.git
   cd FKF-RSS-Scraper
   npm install && node scraper.js
   ```
3. **Push the generated `fkf-news.xml` to your repo:**
   ```bash
   mkdir -p docs
   cp fkf-news.xml docs/
   git add docs/fkf-news.xml
   git commit -m "Add FKF RSS feed"
   git push origin main
   ```
4. **Enable GitHub Pages:**
   - Go to Settings → Pages
   - Source: `main` branch, `/docs` folder
5. **Your feed URL:** `https://yourname.github.io/fkf-feed/fkf-news.xml`

---

### Option 2: AWS S3 (For production & scalability)

Reliable cloud hosting with automatic updates.

```bash
# Configure AWS credentials first
aws configure

# Upload the feed
aws s3 cp fkf-news.xml s3://your-bucket/rss/fkf-news.xml \
  --acl public-read \
  --content-type "application/rss+xml"
```

**Feed URL:** `https://your-bucket.s3.amazonaws.com/rss/fkf-news.xml`

---

### Option 3: Self-Hosted Server (Full control)

Deploy to your own server or WordPress site.

```bash
scp fkf-news.xml user@yourserver.com:/var/www/html/rss/fkf-news.xml
```

**Feed URL:** `https://yourdomain.com/rss/fkf-news.xml`

---

## Automation

### Linux/Mac: Cron Job

Update your feed automatically every hour:

```bash
# Open crontab editor
crontab -e

# Add this line to run every hour
0 * * * * cd /path/to/FKF-RSS-Scraper && node scraper.js && scp fkf-news.xml user@yourserver.com:/var/www/html/rss/fkf-news.xml
```

### Windows: Task Scheduler

Create a scheduled task to run every hour:

```powershell
schtasks /create /tn "FKF RSS Scraper" /tr "node C:\path\to\scraper.js" /sc hourly /mo 1
```

To remove the task:
```powershell
schtasks /delete /tn "FKF RSS Scraper" /f
```

### GitHub Actions (Automated in the cloud)

Create `.github/workflows/scrape.yml`:

```yaml
name: Update FKF RSS Feed

on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:      # Manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: node scraper.js
      - uses: actions/upload-artifact@v3
        with:
          name: fkf-news
          path: fkf-news.xml
```

---

## Subscribe to the Feed

Once you have your feed URL, subscribe using:
- **RSS Readers:** Feedly, Inoreader, The Old Reader, etc.
- **WordPress:** Install [WP RSS Aggregator](https://wordpress.org/plugins/wp-rss-aggregator/) plugin
- **Email:** Services like [Mailmodo](https://mailmodo.com) or [Zapier](https://zapier.com) can send RSS updates to your inbox
- **Slack/Discord:** Use webhooks to post updates to your channels

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **0 articles extracted** | The FKF site structure may have changed. Set `headless: false` in `scraper.js` to watch the browser render and debug manually. |
| **Puppeteer download is slow** | First run downloads Chromium (~170MB). Subsequent runs are fast. Consider increasing timeout in your automation. |
| **Incorrect dates** | If the FKF site doesn't use standard `<time>` tags, the scraper falls back to the current date (which is valid for RSS). |
| **Feed doesn't update** | Check your automation job logs. Verify the feed URL is accessible and the XML file has valid content. |

---

## File Structure

```
FKF-RSS-Scraper/
├── scraper.js          # Main scraper script
├── package.json        # Dependencies
├── README.md           # This file
└── fkf-news.xml        # Generated RSS feed (created after first run)
```

---

## Configuration

Edit `scraper.js` to customize:
- `launch({ headless: true })` → Set to `false` to see the browser in action
- Timeout settings for slower connections
- XPath selectors if the FKF site structure changes

---

## License

This project is provided as-is for educational and personal use. Respect the [FKF website's terms of service](https://footballkenya.org).

---

## Support

- Found a bug? [Open an issue](https://github.com/andrew1440/FKF-RSS-Scraper/issues)
- Have ideas? [Suggest improvements](https://github.com/andrew1440/FKF-RSS-Scraper/discussions)
- Want to contribute? Pull requests welcome! 🙌