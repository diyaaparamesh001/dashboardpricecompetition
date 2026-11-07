# Price Competition Dashboard

A dark-theme dashboard for tracking how your product prices compare with
amazon.in, croma.com and flipkart.com.

It is a static site: plain HTML, CSS and JavaScript, with no build step and no dependencies.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

To publish it, enable **GitHub Pages** for the `main` branch, root folder
(Settings → Pages).

## Sections

- **Overview**: price changes, out-of-stock counts, and the overall price index with a sparkline.
- **Price position**: how many products are cheapest, cheaper than average, average,
  pricier than average or priciest. This is worked out from the product data.
- **Products**: cards or a list, with search, sorting and starring. Each product shows
  a price ladder against competitors, a list of competitor prices, and a one-click
  "Raise to / Lower to" price suggestion. The menu offers Undo and Copy SKU.
- **Competitor details** (open "Competition" on any card): your store next to every
  competitor listing, with price, MRP and discount, weekly price change, delivery fee and
  time, rating and review count. Seller names link to the listing.
- **Compare on: Price / Price + delivery**: switches every ranking, average, index and
  suggestion to landed price.
- **Insights and signals**: a one-line insight on each card (a competitor sale, a cheaper
  rival with a lower rating or slower delivery, a rival rated higher than you), plus a Signals
  filter for the same cases.
- **Sites**: how much of the catalogue each site matches, with search and sorting.
- **Historical index**: a line chart per site (7 days, 30 days, 2 months), with a toggle
  for each series and tooltips on hover.

## Data

Every number on the page is calculated from `js/data.js` (`window.DASHBOARD_DATA`):
products (price, cost, stock) and each competitor listing (price now, price a week ago,
stock). Overview counts, price position, site coverage, indices and suggestions all come
from that one source, so they can't contradict each other. Replace the file, or fill the
object from your API before `js/app.js` loads.

### Pricing rule

Every suggestion follows one rule, set in `pricing`: price **₹10 below the cheapest in-stock
competitor**, but never below a **10% margin**. Each suggestion shows the margin before and
after. Products where the rule can't improve the price show "Hold price" with the reason.

### Price index

Your price ÷ competitor price × 100, averaged per site, then across sites.
100 = same price; above 100 = you're more expensive.

## Design tokens

`css/styles.css` defines the brand palette and type scale (IBM Plex Sans:
Display 32 · H1 24 · H2 18 · H3 14 · Body 13 · Small 12 · Caption 11) in `:root`.
Site colours (teal, mustard, off-white) were chosen from the palette because they
pass a colour-blind separation check together. Green means below market and
orange/red means above market everywhere on the page.

| File | Purpose |
| --- | --- |
| `index.html` | Page structure |
| `css/styles.css` | Styling and design tokens (colours live in `:root`) |
| `js/icons.js` | Inline SVG icons |
| `js/data.js` | Sample data |
| `js/app.js` | Rendering and interactions |
