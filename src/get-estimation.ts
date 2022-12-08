import { Currency } from '@keplr-wallet/types';
import { CoinPretty, Dec, Int } from '@keplr-wallet/unit';

import { Pool } from './osmosis';
import { RoutePathWithAmount } from './types';
import { CoinPrimitive, calculateTokenOutByTokenIn } from './utils/pools';

export const sendCurrency: Currency = {
  coinDenom: 'OSMO',
  coinMinimalDenom: 'uosmo',
  coinDecimals: 6,
};

export const getOsmosisSwapEstimation = async ({
  tokenInCurrency,
  tokenOutCurrency,
  amount: tokenInAmount,
  pools,
  routes: paths,
}: {
  tokenInCurrency: Currency;
  tokenOutCurrency: Currency;
  amount: string;
  pools: Pool[];
  routes: RoutePathWithAmount[];
}): Promise<CoinPretty> => {
  if (!pools || pools.length === 0) {
    throw 'Pool is undefined';
  }

  const amount: CoinPrimitive = {
    denom: tokenInCurrency.coinMinimalDenom,
    amount: tokenInAmount,
  };

  const zero = new CoinPretty(tokenOutCurrency, new Dec(0)).ready(false);
  if (paths.length === 0) {
    return zero;
  }

  const tokenOutAmount = calculateTokenOutByTokenIn(paths);
  if (!tokenOutAmount.gt(new Int(0))) {
    // Not enough liquidity
    return zero;
  }

  return new CoinPretty(tokenOutCurrency, tokenOutAmount).locale(false);
};
