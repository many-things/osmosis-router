<h1 align="center">
  <img alt="satellite-antenna" src="https://emojipedia-us.s3.amazonaws.com/source/microsoft-teams/337/satellite-antenna_1f4e1.png" width="128px" />
  <br />
  <code>@many-things/osmosis-router</code>
</h1>

<p align="center">
  <a aria-label="NPM version" href="https://www.npmjs.com/package/@many-things/osmosis-router">
    <img alt="" src="https://img.shields.io/npm/v/@many-things/osmosis-router.svg?style=for-the-badge&labelColor=000000">
  </a>
  <!-- <a aria-label="NPM bundle size" href="https://github.com/@many-things/osmosis-router/blob/main/LICENSE.md">
    <img alt="" src="https://img.shields.io/bundlephobia/minzip/@many-things/osmosis-router.svg?style=for-the-badge&labelColor=000000">
  </a> -->
  <a aria-label="NPM downloads" href="https://github.com/">
    <img alt="" src="https://img.shields.io/npm/dt/@many-things/osmosis-router?style=for-the-badge&labelColor=000">
  </a>
  <a aria-label="License" href="https://www.npmjs.com/package/@many-things/osmosis-router">
    <img alt="" src="https://img.shields.io/npm/l/@many-things/osmosis-router.svg?style=for-the-badge&labelColor=000000">
  </a>
</p>

<blockquote align="center">
  Minimal SDK for Osmosis Swap Estimation
</blockquote>

```bash
yarn add @many-things/osmosis-router
# or use NPM
npm install @many-things/osmosis-router
```

## ✅ You can...

- Estimate Swap
- Fetch a complete list of LP Pools
- Fetch routes using in/out tokens
- Calculate spot price(using `USDC`(`axlUSDC`) as `tokenOutCurrency`)

## 🚀 Usage

First, Define Currencies for your in/out tokens.

```ts
import { Currency } from '@keplr-wallet/types';

const tokenInCurrency: Currency = {
  coinDenom: 'OSMO',
  coinMinimalDenom: 'uosmo',
  coinDecimals: 6,
};
const tokenOutCurrency: Currency = {
  coinDenom: 'USDC',
  coinMinimalDenom:
    'ibc/D189335C6E4A68B513C10AB227BF1C1D38C746766278BA3EEB4FB14124F1D858',
  coinDecimals: 6,
};
```

And just call `estimateSwap` with the params.

Works like magic!

```ts
import { estimateSwap } from '@many-things/osmosis-router';

// 1 OSMO = 0.899660 USDC
const amount: string = (1 * 10 ** 6).toString();
estimateSwap(tokenInCurrency, tokenOutCurrency, amount); // CoinPretty (0.899660 USDC)
```

> **Note**<br />
>
> `estimateSwap` does the following:
>
> 1. Update pools in Osmosis
> 2. Get Routes (in -> out)
> 3. Estimate swap using resolved route
>
> The following is the current code for `estimateSwap`.
> You can use build your own custom implementation for efficiency, if you're estimating multiple times(e.g. using pools that are already fetched/cached).

```ts
import { type Pool } from '@many-things/osmosis-router';
import Axios, { AxiosInstance } from 'axios';

const defaultInstance = Axios.create({
  baseURL: OSMOSIS_CHAIN_REST,
});

export const estimateSwap = async (
  tokenInCurrency: Currency,
  tokenOutCurrency: Currency,
  amount: string,
  pools?: Pool[],
  instance: AxiosInstance = defaultInstance,
): Promise<CoinPretty> => {
  const { getOsmosisPools, getOsmosisRoutes, getOsmosisSwapEstimation } =
    await import('@many-things/osmosis-router');
  if (!pools) {
    pools = await getOsmosisPools({
      instance,
    }).catch((e) => {
      console.log(e);
      return [];
    });
  }

  const routes = getOsmosisRoutes({
    tokenInCurrency,
    tokenOutCurrency,
    amount,
    pools,
  });

  const tokenOut = getOsmosisSwapEstimation({
    tokenInCurrency,
    tokenOutCurrency,
    amount,
    pools,
    routes,
  });
  return tokenOut;
};
```
