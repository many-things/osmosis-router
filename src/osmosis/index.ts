import { Currency } from '@keplr-wallet/types';
import { Dec, Int } from '@keplr-wallet/unit';
import { Pool } from '@many-things/cosmos-query/dist/apis/osmosis/gamm/types';

import { OSMOSIS_CURRENCIES } from './constants';
import {
  CoinPrimitive,
  SwapPath,
  getOptimizedRoutePaths,
  getPoolAsset,
} from './pools';

export interface Route {
  pool: {
    inPoolAsset: {
      coinDecimals: number;
      coinMinimalDenom: string;
      amount: Int;
      weight: Int;
    };
    outPoolAsset: {
      amount: Int;
      weight: Int;
    };
    swapFee: Dec;
  };
  tokenOutCurrency: Currency;
}

export const getOsmosisRoutes = async ({
  tokenIn,
  tokenOutCurrency,
  pools,
}: {
  tokenIn: {
    currency: Currency;
    amount: string;
  };
  tokenOutCurrency: Currency;
  pools: Pool[];
}): Promise<Route[]> => {
  if (pools === undefined || pools.length === 0) {
    console.error('Pool is undefined');
    return;
  }

  const amount: CoinPrimitive = {
    denom: tokenIn.currency.coinMinimalDenom,
    amount: tokenIn.amount,
  };

  const routes = getOptimizedRoutePaths(amount, tokenOutCurrency, pools);
  // sendSwapExactAmountInMsg
  // https://github.com/osmosis-labs/osmosis-frontend/blob/fc757c5b6c5cf17846eafd3747246491858e1db7/packages/stores/src/account/index.ts#L578-L696

  if (routes.length === 0) {
    throw 'There is no matched pool';
  }

  if (routes[0].pools.length === 1) {
    const [pool] = routes[0].pools;
    const inPoolAssetInfo = getPoolAsset(
      pool,
      tokenIn.currency.coinMinimalDenom,
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
      coinDecimals: tokenIn.currency.coinDecimals,
      coinMinimalDenom: tokenIn.currency.coinMinimalDenom,
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
    const routePath: Route[] = routes[0].pools.map((pool, index) => {
      const outTokenMinimalDenom = routes[0].tokenOutDenoms[index];
      const outTokenCurrency = OSMOSIS_CURRENCIES.find(
        (item) => item.coinMinimalDenom === outTokenMinimalDenom,
      );

      if (outTokenCurrency === undefined) {
        throw 'no out currency';
      }
      return {
        pool: {
          inPoolAsset: {
            coinDecimals: tokenIn.currency.coinDecimals,
            coinMinimalDenom: tokenIn.currency.coinMinimalDenom,
            amount: new Int(pool.pool_assets[0].token.amount),
            weight: new Int(pool.pool_assets[0].weight),
          },
          outPoolAsset: {
            amount: new Int(pool.pool_assets[1].token.amount),
            weight: new Int(pool.pool_assets[1].weight),
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
