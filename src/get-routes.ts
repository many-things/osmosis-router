import { Currency } from '@keplr-wallet/types';
import { Dec, Int } from '@keplr-wallet/unit';
import { Pool } from '@many-things/cosmos-query/dist/apis/osmosis/gamm/types';

import { Route } from './types';
import {
  CoinPrimitive,
  getOptimizedRoutePaths,
  getPoolAsset,
} from './utils/pools';

export const getOsmosisRoutes = async ({
  tokenInCurrency,
  tokenOutCurrency,
  amount: tokenInAmount,
  pools,
}: {
  tokenInCurrency: Currency;
  tokenOutCurrency: Currency;
  amount: string;
  pools: Pool[];
}): Promise<Route[]> => {
  if (pools === undefined || pools.length === 0) {
    throw 'Pool is undefined';
  }

  const amount: CoinPrimitive = {
    denom: tokenInCurrency.coinMinimalDenom,
    amount: tokenInAmount,
  };

  const routes = getOptimizedRoutePaths(amount, tokenOutCurrency, pools);
  if (routes.length === 0) {
    throw 'There is no matched pool';
  }

  if (routes[0].pools.length === 1) {
    const [pool] = routes[0].pools;
    const inPoolAssetInfo = getPoolAsset(
      pool,
      tokenInCurrency.coinMinimalDenom,
    );
    const outPoolAssetInfo = getPoolAsset(
      pool,
      tokenOutCurrency.coinMinimalDenom,
    );

    const inPoolAsset: {
      coinDecimals: number;
      coinMinimalDenom: string;
      amount: Int;
      weight: Int;
    } = {
      coinDecimals: tokenInCurrency.coinDecimals,
      coinMinimalDenom: tokenInCurrency.coinMinimalDenom,
      amount: new Int(inPoolAssetInfo.token.amount),
      weight: new Int(inPoolAssetInfo.weight),
    };
    const outPoolAsset = {
      amount: new Int(outPoolAssetInfo.token.amount),
      weight: new Int(outPoolAssetInfo.weight),
    };

    return [
      {
        pool: {
          inPoolAsset,
          outPoolAsset,
          swapFee: new Dec(pool.pool_params.swap_fee),
        },
        tokenOutCurrency,
      },
    ];
  } else {
    const { OSMOSIS_CURRENCIES } = await import('./constants');
    const routePath: Route[] = routes[0].pools.map((pool, index) => {
      const outTokenMinimalDenom = routes[0].tokenOutDenoms[index];
      const outTokenCurrency = OSMOSIS_CURRENCIES.find(
        (item) => item.coinMinimalDenom === outTokenMinimalDenom,
      );

      if (!outTokenCurrency) {
        throw 'no out currency';
      }

      const [inPoolAsset, outPoolAsset] = pool.pool_assets;
      return {
        pool: {
          inPoolAsset: {
            coinDecimals: tokenInCurrency.coinDecimals,
            coinMinimalDenom: tokenInCurrency.coinMinimalDenom,
            amount: new Int(inPoolAsset.token.amount),
            weight: new Int(inPoolAsset.weight),
          },
          outPoolAsset: {
            amount: new Int(outPoolAsset.token.amount),
            weight: new Int(outPoolAsset.weight),
          },
          swapFee: new Dec(pool.pool_params.swap_fee),
        },
        tokenOutCurrency: {
          coinDenom: outTokenCurrency.coinDenom,
          coinMinimalDenom: outTokenCurrency.coinMinimalDenom,
          coinDecimals: outTokenCurrency.coinDecimals,
        },
      };
    });

    return routePath;
  }
};
