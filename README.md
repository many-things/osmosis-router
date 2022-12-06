<h1 align="center">
  <img alt="satellite-antenna" src="https://emojipedia-us.s3.amazonaws.com/source/microsoft-teams/337/satellite-antenna_1f4e1.png" width="128px" />
  <br />
  <code>@junhoyeo/osmosis-router</code>
</h1>

<blockquote align="center">
Minimal SDK for Swap Estimation and Spot Price Calculation
</blockquote>

> **Warning**<br />
> Still in draft. Not packaged yet.

## 🚀 Usage

First, Define Currencies for your in/out tokens.

```ts
// You can also use the type from `@keplr-wallet/types`
import { type Currency } from '@junhoyeo/osmosis-router';

const tokenInCurrency = {
  coinDenom: 'OSMO',
  coinMinimalDenom: 'uosmo',
  coinDecimals: 6,
};
const tokenOutCurrency = {
  coinDenom: 'USDC',
  coinMinimalDenom:
    'ibc/D189335C6E4A68B513C10AB227BF1C1D38C746766278BA3EEB4FB14124F1D858',
  coinDecimals: 6,
};
```

And just call `getSwapEstimation` with the params.

Works like magic!

```ts
import { getSwapEstimation } from '@junhoyeo/osmosis-router';

// 1 OSMO = 0.965247 USDC
const amount: string = '1';
getSwapEstimation(tokenInCurrency, tokenOutCurrency, amount); // CoinPretty (0.965247 USDC)
```

> **Note**<br />
>
> `getSwapEstimation` does the following:
>
> 1. Update pools in Osmosis
> 2. Get Routes (in -> out)
> 3. Estimate swap using resolved route
>
> The following is the current code for `getSwapEstimation`.
> You can use build your own custom implementation for efficiency, if you're using estimating multiple times(e.g. using already-fetched pools).

```ts
const getSwapEstimation = async (
  tokenInCurrency: Currency,
  tokenOutCurrency: Currency,
  amount: string,
) => {
  const [
    { getOsmosisPools },
    { getOsmosisRoutes },
    { getOsmosisSwapEstimation },
  ] = await Promise.all([
    import('@junhoyeo/osmosis-router/get-pools'),
    import('@junhoyeo/osmosis-router/get-routes'),
    import('@junhoyeo/osmosis-router/get-estimation'),
  ]);
  const routes = await getOsmosisRoutes({
    tokenInCurrency,
    tokenOutCurrency,
    pools,
  });

  const tokenOut = getOsmosisSwapEstimation(tokenInCurrency, routes, amount);
  return tokenOut;
};
```
