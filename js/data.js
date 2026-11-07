/*
 * Sample data for the price competition dashboard.
 *
 * Everything on the page (overview counts, price position, site coverage,
 * indices, suggestions) is derived from this one object, so the numbers can
 * never disagree with each other. Replace it with real data to go live.
 */
window.DASHBOARD_DATA = {
  user: {
    name: "Johnathan Samuel",
    lastUpdated: "6 Nov, 6:00 AM",
  },

  // How the "Raise to / Lower to" suggestion is worked out — one rule for every product:
  // price `undercut` below the cheapest in-stock competitor, but never below `marginFloor`.
  pricing: {
    undercut: 10,      // ₹ below the cheapest in-stock competitor
    marginFloor: 10,   // % — suggestions never go below this margin
    averageBand: 1,    // % — within ±1% of the competitor average counts as "average"
  },

  // Colours come from the brand palette and passed a colour-blind check together.
  sites: [
    { id: "amazon", name: "amazon.in", initial: "A", color: "#3aaf96", searchUrl: "https://www.amazon.in/s?k=" },
    { id: "croma", name: "croma.com", initial: "C", color: "#bf9a42", searchUrl: "https://www.croma.com/searchB?q=" },
    { id: "flipkart", name: "flipkart.com", initial: "F", color: "#f2f2f2", searchUrl: "https://www.flipkart.com/search?q=" },
  ],

  // `cost` is your unit cost (margin is derived from it).
  // Your store's rating, reviews and delivery are compared with each competitor listing.
  // Each listing: price now, price a week ago, stock, MRP (for the discount), rating,
  // review count and delivery (fee in ₹, days to deliver).
  // A site that doesn't list the product is simply left out.
  products: [
    {
      id: 12450, name: "Wireless over-ear headphones", brand: "SoundCore", category: "Audio",
      price: 1299, cost: 1070, inStock: true,
      rating: 4.4, reviews: 862, delivery: { fee: 0, days: 2 },
      competitors: {
        amazon: { price: 1199, prev: 1199, inStock: true, mrp: 1999, rating: 3.9, reviews: 2140, delivery: { fee: 0, days: 1 } },
        croma: { price: 1249, prev: 1249, inStock: true, mrp: 1799, rating: 4.2, reviews: 318, delivery: { fee: 0, days: 3 } },
        flipkart: { price: 1349, prev: 1299, inStock: true, mrp: 1999, rating: 4.1, reviews: 1520, delivery: { fee: 40, days: 4 } },
      },
    },
    {
      id: 12462, name: "Portable Bluetooth speaker 20W", brand: "SoundCore", category: "Audio",
      price: 2499, cost: 1987, inStock: true,
      rating: 4.3, reviews: 410, delivery: { fee: 0, days: 2 },
      competitors: {
        amazon: { price: 2549, prev: 2549, inStock: true, mrp: 3499, rating: 4.2, reviews: 1870, delivery: { fee: 0, days: 1 } },
        croma: { price: 2599, prev: 2599, inStock: true, mrp: 2999, rating: 4.0, reviews: 142, delivery: { fee: 0, days: 3 } },
        flipkart: { price: 2649, prev: 2649, inStock: true, mrp: 3299, rating: 4.3, reviews: 960, delivery: { fee: 0, days: 2 } },
      },
    },
    {
      id: 12471, name: "Smartwatch with 1.8-inch display", brand: "Pulse", category: "Wearables",
      price: 3999, cost: 3251, inStock: true,
      rating: 4.1, reviews: 1290, delivery: { fee: 0, days: 2 },
      competitors: {
        amazon: { price: 3499, prev: 3599, inStock: true, mrp: 4999, rating: 4.0, reviews: 5320, delivery: { fee: 0, days: 1 } },
        croma: { price: 3599, prev: 3599, inStock: true, mrp: 4499, rating: 3.8, reviews: 211, delivery: { fee: 0, days: 3 } },
        flipkart: { price: 3749, prev: 3749, inStock: true, mrp: 4999, rating: 4.1, reviews: 3410, delivery: { fee: 0, days: 2 } },
      },
    },
    {
      id: 12488, name: "USB-C fast charger 65W", brand: "VoltEdge", category: "Accessories",
      price: 1099, cost: 880, inStock: true,
      rating: 4.2, reviews: 655, delivery: { fee: 0, days: 1 },
      competitors: {
        amazon: { price: 999, prev: 999, inStock: true, mrp: 1499, rating: 4.3, reviews: 890, delivery: { fee: 49, days: 5 } },
        croma: { price: 1149, prev: 1149, inStock: true, mrp: 1499, rating: 4.1, reviews: 96, delivery: { fee: 0, days: 2 } },
        flipkart: { price: 1199, prev: 1199, inStock: false, mrp: 1599, rating: 4.0, reviews: 402, delivery: { fee: 0, days: 3 } },
      },
    },
    {
      id: 12493, name: "Wired earphones with mic", brand: "SoundCore", category: "Audio",
      price: 499, cost: 387, inStock: true,
      rating: 4.0, reviews: 2310, delivery: { fee: 40, days: 3 },
      competitors: {
        amazon: { price: 519, prev: 519, inStock: true, mrp: 799, rating: 3.9, reviews: 12400, delivery: { fee: 0, days: 1 } },
        flipkart: { price: 529, prev: 549, inStock: true, mrp: 799, rating: 4.0, reviews: 8650, delivery: { fee: 0, days: 2 } },
      },
    },
    {
      id: 12501, name: "Power bank 10000mAh", brand: "VoltEdge", category: "Accessories",
      price: 1499, cost: 1271, inStock: true,
      rating: 4.3, reviews: 980, delivery: { fee: 0, days: 2 },
      competitors: {
        amazon: { price: 1479, prev: 1479, inStock: true, mrp: 1999, rating: 4.2, reviews: 6210, delivery: { fee: 0, days: 1 } },
        croma: { price: 1509, prev: 1509, inStock: false, mrp: 1999, rating: 4.1, reviews: 180, delivery: { fee: 0, days: 3 } },
        flipkart: { price: 1519, prev: 1519, inStock: true, mrp: 2199, rating: 4.3, reviews: 3920, delivery: { fee: 0, days: 2 } },
      },
    },
    {
      id: 12514, name: "Wireless optical mouse", brand: "VoltEdge", category: "Accessories",
      price: 799, cost: 606, inStock: true,
      rating: 3.8, reviews: 1540, delivery: { fee: 0, days: 2 },
      competitors: {
        amazon: { price: 785, prev: 785, inStock: true, mrp: 1299, rating: 4.1, reviews: 4480, delivery: { fee: 0, days: 1 } },
        flipkart: { price: 815, prev: 815, inStock: true, mrp: 1199, rating: 4.2, reviews: 2210, delivery: { fee: 0, days: 2 } },
      },
    },
    {
      id: 12522, name: "Mechanical keyboard, blue switches", brand: "VoltEdge", category: "Accessories",
      price: 2999, cost: 2495, inStock: true,
      rating: 4.5, reviews: 312, delivery: { fee: 0, days: 3 },
      competitors: {
        amazon: { price: 2989, prev: 2989, inStock: true, mrp: 3999, rating: 4.4, reviews: 720, delivery: { fee: 0, days: 2 } },
        croma: { price: 3049, prev: 2999, inStock: true, mrp: 3699, rating: 4.3, reviews: 64, delivery: { fee: 99, days: 4 } },
      },
    },
    {
      id: 12537, name: "Full HD 1080p webcam", brand: "Pulse", category: "Wearables",
      price: 1899, cost: 1616, inStock: false,
      rating: 4.0, reviews: 205, delivery: { fee: 0, days: 2 },
      competitors: {
        amazon: { price: 1879, prev: 1879, inStock: true, mrp: 2999, rating: 3.7, reviews: 1630, delivery: { fee: 0, days: 1 } },
        croma: { price: 1929, prev: 1929, inStock: true, mrp: 2499, rating: 4.0, reviews: 88, delivery: { fee: 0, days: 3 } },
        flipkart: { price: 1949, prev: 1949, inStock: true, mrp: 2799, rating: 3.9, reviews: 940, delivery: { fee: 0, days: 2 } },
      },
    },
    {
      id: 12546, name: "Aluminium laptop stand", brand: "Pulse", category: "Accessories",
      price: 1149, cost: 904, inStock: true,
      rating: 4.6, reviews: 488, delivery: { fee: 0, days: 2 },
      competitors: {
        amazon: { price: 1099, prev: 1099, inStock: false, mrp: 1799, rating: 4.4, reviews: 2890, delivery: { fee: 0, days: 1 } },
        croma: { price: 1129, prev: 1129, inStock: true, mrp: 1499, rating: 4.2, reviews: 120, delivery: { fee: 0, days: 3 } },
        flipkart: { price: 1179, prev: 1199, inStock: true, mrp: 1699, rating: 4.3, reviews: 1180, delivery: { fee: 0, days: 2 } },
      },
    },
  ],

  // Shape of each site's index over the last 7 days. app.js shifts every line so
  // today's point equals the index computed from the products above.
  history: {
    endDate: "2026-11-06",
    week: {
      amazon: [99.1, 100.0, 98.2, 100.9, 100.8, 101.9, 102],
      croma: [104.0, 105.8, 105.0, 106.8, 105.6, 107.9, 108],
      flipkart: [101.2, 102.0, 102.8, 102.4, 103.0, 102.2, 103],
    },
  },
};
