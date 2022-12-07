import { Currency } from '@keplr-wallet/types';
import { CoinPretty } from '@keplr-wallet/unit';

import { Pool } from './types';

export const estimateSwap = async (
  tokenInCurrency: Currency,
  tokenOutCurrency: Currency,
  amount: string,
  pools?: Pool[],
): Promise<CoinPretty> => {
  const [
    { getOsmosisPools },
    { getOsmosisRoutes },
    { getOsmosisSwapEstimation },
  ] = await Promise.all([
    !pools ? import('./get-pools') : { getOsmosisPools: () => [] },
    import('./get-routes'),
    import('./get-estimation'),
  ]);
  if (!pools) {
    pools = await getOsmosisPools();
  }

  const routes = await getOsmosisRoutes({
    tokenInCurrency,
    tokenOutCurrency,
    amount,
    pools,
  });

  const tokenOut = getOsmosisSwapEstimation(tokenInCurrency, routes, amount);
  return tokenOut;
};
