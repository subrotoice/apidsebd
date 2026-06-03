const express = require('express');
const serverless = require('serverless-http');
const { fetchLatestSharePrices } = require('./scraper');

const PORT = Number(process.env.PORT || 3000);
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const app = express();

const cache = {
  stocks: [],
  stockByCode: new Map(),
  lastUpdated: null,
  lastError: null,
  refreshInProgress: false
};

function toBdtISOString(date = new Date()) {
  const bdtOffsetMs = 6 * 60 * 60 * 1000;
  return new Date(date.getTime() + bdtOffsetMs).toISOString().replace('Z', '+06:00');
}

function updateCache(stocks) {
  cache.stocks = stocks;
  cache.stockByCode = new Map(stocks.map((stock) => [stock.tradingCode.toUpperCase(), stock]));
  cache.lastUpdated = toBdtISOString();
  cache.lastError = null;
}

async function refreshStockCache(fetcher = fetchLatestSharePrices) {
  if (cache.refreshInProgress) {
    return;
  }

  cache.refreshInProgress = true;

  try {
    const stocks = await fetcher();
    updateCache(stocks);
    console.log(`Loaded ${stocks.length} DSE stock rows at ${cache.lastUpdated}`);
  } catch (error) {
    cache.lastError = {
      message: error.message,
      time: toBdtISOString()
    };
    console.error(`DSE refresh failed: ${error.message}`);
  } finally {
    cache.refreshInProgress = false;
  }
}

// Middleware to ensure cache is populated in serverless environment
app.use(async (req, res, next) => {
  if (!cache.lastUpdated && !cache.refreshInProgress) {
    await refreshStockCache();
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({
    status: cache.lastUpdated ? 'ok' : 'starting',
    lastUpdated: cache.lastUpdated,
    count: cache.stocks.length,
    refreshInProgress: cache.refreshInProgress,
    lastError: cache.lastError
  });
});

app.get('/api/stocks', (_req, res) => {
  res.json({
    lastUpdated: cache.lastUpdated,
    count: cache.stocks.length,
    data: cache.stocks
  });
});

app.get('/api/stocks/:code', (req, res) => {
  const stock = cache.stockByCode.get(req.params.code.toUpperCase());

  if (!stock) {
    return res.status(404).json({
      error: 'Stock not found'
    });
  }

  return res.json({
    lastUpdated: cache.lastUpdated,
    data: stock
  });
});

function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`DSE LTP + Volume API listening on http://localhost:${PORT}`);
    refreshStockCache();
  });

  const refreshTimer = setInterval(refreshStockCache, REFRESH_INTERVAL_MS);

  function shutdown() {
    clearInterval(refreshTimer);
    server.close(() => {
      process.exit(0);
    });
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return { server, refreshTimer };
}

if (require.main === module) {
  startServer();
}

// Export for Netlify Functions
module.exports = {
  app,
  cache,
  refreshStockCache,
  REFRESH_INTERVAL_MS,
  startServer,
  toBdtISOString,
  handler: serverless(app)
};
