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
- **Sites**: how much of the catalogue each site matches, with search and sorting.
- **Historical index**: a line chart per site (7 days, 30 days, 2 months), with a toggle
  for each series and tooltips on hover.

## Data

All numbers come from `js/data.js` (`window.DASHBOARD_DATA`). Replace that file,
or fill the object from your API before `js/app.js` loads, to show real data.

| File | Purpose |
| --- | --- |
| `index.html` | Page structure |
| `css/styles.css` | Styling and design tokens (colours live in `:root`) |
| `js/icons.js` | Inline SVG icons |
| `js/data.js` | Sample data |
| `js/app.js` | Rendering and interactions |
