# DSE LTP + Volume API

Small Express API that fetches DSE latest share prices, keeps the last successful result in memory, and refreshes every 5 minutes.

## Scripts

```bash
npm start
npm run dev
```

## Endpoints

- `GET /api/stocks`
- `GET /api/stocks/:code`
- `GET /health`

The scraper reads `TRADING CODE`, `LTP`, and `VOLUME` from DSE's latest share price table.
