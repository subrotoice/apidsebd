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

The scraper reads `TRADING CODE`, `LTP`, `HIGH`, `LOW`, `CLOSEP`, `YCP`, `CHANGE`, `TRADE`, `VALUE (mn)`, and `VOLUME` from DSE's latest share price table.

Response timestamps use Bangladesh time in ISO format with the `+06:00` offset, for example `2026-06-02T12:00:52.454+06:00`.

Example stock object:

```json
{
  "tradingCode": "ABBANK",
  "ltp": 4.2,
  "high": 4.3,
  "low": 4.1,
  "closePrice": 4.2,
  "ycp": 4.2,
  "change": 0,
  "trade": 35,
  "valueMn": 1.23,
  "volume": 123456
}
```
