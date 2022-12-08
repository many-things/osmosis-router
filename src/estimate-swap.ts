import { Currency } from '@keplr-wallet/types';
import { CoinPretty } from '@keplr-wallet/unit';

import { Pool } from './types';

export const estimateSwap = async (
  tokenInCurrency: Currency,
  tokenOutCurrency: Currency,
  amount: string,
  pools?: Pool[],
) => {
  const [
    { getOsmosisPools },
    { getOsmosisRoutes },
    { getOsmosisSwapEstimation },
  ] = await Promise.all([
    !pools ? import('./get-pools') : { getOsmosisPools: async () => [] },
    import('./get-routes'),
    import('./get-estimation'),
  ]);
  if (!pools) {
    pools = await getOsmosisPools().catch((e) => {
      console.log(e);
      return [];
    });
  }

  const routes = await getOsmosisRoutes({
    tokenInCurrency,
    tokenOutCurrency,
    amount,
    pools,
  });
  return routes;
};
