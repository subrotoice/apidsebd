const cheerio = require('cheerio');

const DSE_LATEST_PRICE_URL = 'https://www.dsebd.org/latest_share_price_scroll_l.php';

function parseNumber(value) {
  const normalized = String(value || '').replace(/,/g, '').trim();
  if (!normalized || normalized === '--') {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseVolume(value) {
  const parsed = parseNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function parseLatestSharePriceHtml(html) {
  const $ = cheerio.load(html);
  const stocks = [];

  $('table.shares-table tr').each((_, row) => {
    const columns = $(row).find('td');
    if (columns.length < 11) {
      return;
    }

    const tradingCode = $(columns[1]).text().trim();
    if (!tradingCode || tradingCode.toUpperCase() === 'TRADING CODE') {
      return;
    }

    stocks.push({
      tradingCode,
      ltp: parseNumber($(columns[2]).text()),
      volume: parseVolume($(columns[10]).text())
    });
  });

  return stocks;
}

async function fetchLatestSharePrices(url = DSE_LATEST_PRICE_URL) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'dse-ltp-volume-api/1.0 (+https://www.dsebd.org/)'
    }
  });

  if (!response.ok) {
    throw new Error(`DSE request failed with status ${response.status}`);
  }

  const html = await response.text();
  const stocks = parseLatestSharePriceHtml(html);

  if (stocks.length === 0) {
    throw new Error('No stock rows found in DSE latest share price table');
  }

  return stocks;
}

module.exports = {
  DSE_LATEST_PRICE_URL,
  fetchLatestSharePrices,
  parseLatestSharePriceHtml
};
