## Vault incentives script

### To run

1. `npm install`
2. `cp .env.example .env` and configure
3. `source .env`
4. `node scripts/rewards/rewards-generator.js scripts/rewards/output/configs/week46.json`

Optionally, run on just a single chain / collateral:

```
node scripts/rewards/rewards-generator.js scripts/rewards/output/configs/week46.json 42161 "WBTC (Arbitrum)"
```
