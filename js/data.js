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
    { id: "amazon", name: "amazon.in", initial: "A", color: "#3aaf96" },
    { id: "croma", name: "croma.com", initial: "C", color: "#bf9a42" },
    { id: "flipkart", name: "flipkart.com", initial: "F", color: "#f2f2f2" },
  ],

  // `cost` is your unit cost (margin is derived from it).
  // Each competitor listing: price now, price a week ago, and whether it is in stock.
  // A site that doesn't list the product is simply left out.
  products: [
    {
      id: 12450, name: "Wireless over-ear headphones", brand: "SoundCore", category: "Audio",
      price: 1299, cost: 1070, inStock: true,
      competitors: {
        amazon: { price: 1199, prev: 1249, inStock: true },
        croma: { price: 1249, prev: 1249, inStock: true },
        flipkart: { price: 1349, prev: 1299, inStock: true },
      },
    },
    {
      id: 12462, name: "Portable Bluetooth speaker 20W", brand: "SoundCore", category: "Audio",
      price: 2499, cost: 1987, inStock: true,
      competitors: {
        amazon: { price: 2549, prev: 2549, inStock: true },
        croma: { price: 2599, prev: 2599, inStock: true },
        flipkart: { price: 2649, prev: 2649, inStock: true },
      },
    },
    {
      id: 12471, name: "Smartwatch with 1.8-inch display", brand: "Pulse", category: "Wearables",
      price: 3999, cost: 3251, inStock: true,
      competitors: {
        amazon: { price: 3499, prev: 3599, inStock: true },
        croma: { price: 3599, prev: 3599, inStock: true },
        flipkart: { price: 3749, prev: 3749, inStock: true },
      },
    },
    {
      id: 12488, name: "USB-C fast charger 65W", brand: "VoltEdge", category: "Accessories",
      price: 1099, cost: 880, inStock: true,
      competitors: {
        amazon: { price: 999, prev: 999, inStock: true },
        croma: { price: 1149, prev: 1149, inStock: true },
        flipkart: { price: 1199, prev: 1199, inStock: false },
      },
    },
    {
      id: 12493, name: "Wired earphones with mic", brand: "SoundCore", category: "Audio",
      price: 499, cost: 387, inStock: true,
      competitors: {
        amazon: { price: 519, prev: 519, inStock: true },
        flipkart: { price: 529, prev: 549, inStock: true },
      },
    },
    {
      id: 12501, name: "Power bank 10000mAh", brand: "VoltEdge", category: "Accessories",
      price: 1499, cost: 1271, inStock: true,
      competitors: {
        amazon: { price: 1479, prev: 1479, inStock: true },
        croma: { price: 1509, prev: 1509, inStock: false },
        flipkart: { price: 1519, prev: 1519, inStock: true },
      },
    },
    {
      id: 12514, name: "Wireless optical mouse", brand: "VoltEdge", category: "Accessories",
      price: 799, cost: 606, inStock: true,
      competitors: {
        amazon: { price: 785, prev: 785, inStock: true },
        flipkart: { price: 815, prev: 815, inStock: true },
      },
    },
    {
      id: 12522, name: "Mechanical keyboard, blue switches", brand: "VoltEdge", category: "Accessories",
      price: 2999, cost: 2495, inStock: true,
      competitors: {
        amazon: { price: 2989, prev: 2989, inStock: true },
        croma: { price: 3049, prev: 2999, inStock: true },
      },
    },
    {
      id: 12537, name: "Full HD 1080p webcam", brand: "Pulse", category: "Wearables",
      price: 1899, cost: 1616, inStock: false,
      competitors: {
        amazon: { price: 1879, prev: 1879, inStock: true },
        croma: { price: 1929, prev: 1929, inStock: true },
        flipkart: { price: 1949, prev: 1949, inStock: true },
      },
    },
    {
      id: 12546, name: "Aluminium laptop stand", brand: "Pulse", category: "Accessories",
      price: 1149, cost: 904, inStock: true,
      competitors: {
        amazon: { price: 1099, prev: 1099, inStock: false },
        croma: { price: 1129, prev: 1129, inStock: true },
        flipkart: { price: 1179, prev: 1199, inStock: true },
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
