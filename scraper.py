import os
import requests
from bs4 import BeautifulSoup
from email.utils import formatdate
import datetime
from xml.sax.saxutils import escape

def fetch_and_generate_rss(url, output_file):
    # 1. Fetch the web page
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    print(f"Fetching {url}...")
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL: {e}")
        return

    # 2. Parse HTML using BeautifulSoup
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Try to find article containers. Often they are <article> tags, or divs with class 'post' or 'article'
    articles = soup.find_all('article')
    if not articles:
        # Fallback: look for generic post wrappers
        articles = soup.find_all('div', class_=lambda c: c and ('post' in c or 'news-item' in c))

    rss_items = []
    
    for idx, article in enumerate(articles):
        # Extract URL and Title from standard heading tags or anchor tags
        # We look for an <a> tag inside a heading (h2, h3, h4) or the first prominent <a> tag
        heading = article.find(['h1', 'h2', 'h3', 'h4'])
        if heading and heading.find('a'):
            a_tag = heading.find('a')
        else:
            a_tag = article.find('a')
            
        if not a_tag or not a_tag.get('href'):
            continue
            
        title = a_tag.get_text(strip=True)
        link = a_tag['href']
        
        # Ensure the link is absolute
        if link.startswith('/'):
            link = "https://footballkenya.org" + link

        # Extract Date
        # Typically wrapped in <time> tag or a div/span with class containing 'date'
        date_str = None
        time_tag = article.find('time')
        if time_tag and time_tag.get('datetime'):
            date_str = time_tag['datetime']
        else:
            date_elem = article.find(class_=lambda c: c and 'date' in c)
            if date_elem:
                date_str = date_elem.get_text(strip=True)
        
        # Parse date to RSS standard format (RFC 822)
        # If we can't parse it, we default to the current time for the feed validity
        pub_date = formatdate(localtime=True)
        if date_str:
            try:
                # Try parsing standard ISO format if it's from a datetime attribute
                dt = datetime.datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                pub_date = formatdate(dt.timestamp(), localtime=False)
            except ValueError:
                # If parsing fails, stick to current time for standard compliance
                pass

        rss_items.append({
            'title': title,
            'link': link,
            'pub_date': pub_date,
            'description': f"News article: {title}" # Could be enhanced to extract excerpts
        })
        
        if len(rss_items) >= 15: # Limit to latest 15 items
            break

    print(f"Extracted {len(rss_items)} articles.")

    # 3. Generate RSS XML
    # Using simple string formatting for the RSS structure
    rss_template = f"""<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
    <title>Football Kenya Federation News</title>
    <link>https://www.footballkenya.org/news</link>
    <description>Latest news from Football Kenya Federation, scraped dynamically.</description>
    <lastBuildDate>{formatdate(localtime=True)}</lastBuildDate>
"""
    
    for item in rss_items:
        rss_template += f"""
    <item>
        <title>{escape(item['title'])}</title>
        <link>{escape(item['link'])}</link>
        <pubDate>{item['pub_date']}</pubDate>
        <description>{escape(item['description'])}</description>
        <guid>{escape(item['link'])}</guid>
    </item>"""
        
    rss_template += """
</channel>
</rss>
"""

    # 4. Save to file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(rss_template)
    
    print(f"Successfully wrote RSS feed to {output_file}")


if __name__ == "__main__":
    target_url = "https://footballkenya.org/news"
    # Or "https://footballkenya.org/category/news/" depending on actual URL structure
    
    # Write to a public folder or current directory
    output_xml_path = "fkf-news.xml"
    fetch_and_generate_rss(target_url, output_xml_path)
