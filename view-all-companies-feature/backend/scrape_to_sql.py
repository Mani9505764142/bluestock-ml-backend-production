import requests, re, time, pandas as pd
from bs4 import BeautifulSoup

# ── put your own cookie values here ─────────────────────────────
headers = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) "
                   "Chrome/117.0.0.0 Safari/537.36"),
    "Cookie": "sessionid=0g451afrdm7489sh2k432hlff35f6gzf; csrftoken=YO051l20zGafWMzDMJy7rRPO1fjJED4B"
}
# ────────────────────────────────────────────────────────────────

def grab(soup, pattern):
    tag = soup.find("span", string=re.compile(pattern))
    return tag.find_next("span").text.strip("% ") if tag else None

rows = []

for t in open("tickers.txt"):
    t = t.strip()
    if not t:
        continue

    url = f"https://www.screener.in/company/{t}/"
    try:
        html = requests.get(url, headers=headers, timeout=10).text
    except Exception as e:
        print("⚠️  network error", t, e)
        continue

    if "captcha" in html.lower():
        print("⏸️  blocked by Screener → waiting 60 s")
        time.sleep(60)
        continue

    soup = BeautifulSoup(html, "html.parser")

    data = {
        "10S": grab(soup, "10 Years Sales Growth"),
        "5S" : grab(soup, "5 Years Sales Growth"),
        "3S" : grab(soup, "3 Years Sales Growth"),
        "TS" : grab(soup, "TTM Sales Growth|Latest Sales Growth"),
        "10P": grab(soup, "10 Years Profit Growth"),
        "5P" : grab(soup, "5 Years Profit Growth"),
        "3P" : grab(soup, "3 Years Profit Growth"),
        "TP" : grab(soup, "TTM Profit Growth|Latest Profit Growth"),
        "10C": grab(soup, "10 Years Return"),
        "5C" : grab(soup, "5 Years Return"),
        "3C" : grab(soup, "3 Years Return"),
        "1C" : grab(soup, "1 Year Return"),
        "10R": grab(soup, "10 Years ROE"),
        "5R" : grab(soup, "5 Years ROE"),
        "3R" : grab(soup, "3 Years ROE"),
        "LR" : grab(soup, "Last Year ROE"),
    }

    if None in data.values():
        print("⚠️  skipped", t)
        continue

    rows.extend([
        (t, f"10 Years: {data['10S']}%", f"10 Years: {data['10P']}%", f"10 Years: {data['10C']}%", f"10 Years: {data['10R']}%"),
        (t, f"5 Years: {data['5S']}%",  f"5 Years: {data['5P']}%",  f"5 Years: {data['5C']}%",  f"5 Years: {data['5R']}%"),
        (t, f"3 Years: {data['3S']}%",  f"3 Years: {data['3P']}%",  f"3 Years: {data['3C']}%",  f"3 Years: {data['3R']}%"),
        (t, f"TTM: {data['TS']}%",      f"TTM: {data['TP']}%",      f"1 Year: {data['1C']}%",   f"Last Year: {data['LR']}%"),
    ])

    time.sleep(2)               # polite pause

# ── write one bulk-insert file ─────────────────────────────────
values = ",\n".join(
    "('{}','{}','{}','{}','{}')".format(*r).replace("%", "%%") for r in rows
)

with open("bulk_insert.sql", "w", encoding="utf-8") as f:
    f.write(
        "INSERT INTO analysis "
        "(company_id, compounded_sales_growth, compounded_profit_growth, "
        "stock_price_cagr, roe)\nVALUES\n" + values + ";"
    )

print(f"✅ Wrote {len(rows)} rows to bulk_insert.sql")
