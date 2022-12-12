import { Currency } from '@keplr-wallet/types';
import { CoinPretty } from '@keplr-wallet/unit';
import Axios, { AxiosInstance } from 'axios';

import { OSMOSIS_CHAIN_REST } from './constants';
import { Pool } from './types';

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
