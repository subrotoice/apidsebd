const express = require('express');
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

function updateCache(stocks) {
  cache.stocks = stocks;
  cache.stockByCode = new Map(stocks.map((stock) => [stock.tradingCode.toUpperCase(), stock]));
  cache.lastUpdated = new Date().toISOString();
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
      time: new Date().toISOString()
    };
    console.error(`DSE refresh failed: ${error.message}`);
  } finally {
    cache.refreshInProgress = false;
  }
}

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

module.exports = {
  app,
  cache,
  refreshStockCache,
  REFRESH_INTERVAL_MS,
  startServer
};
