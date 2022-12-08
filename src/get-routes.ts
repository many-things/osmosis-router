import { Currency } from '@keplr-wallet/types';
import { Int } from '@keplr-wallet/unit';

import { Pool } from './osmosis';
import { RoutePathWithAmount } from './types';
import { CoinPrimitive, getOptimizedRoutesByTokenIn } from './utils/pools';

/**
 * Get optimized swap route path from given pool (`getOptimizedRoutePaths`)
 * https://github.com/osmosis-labs/osmosis-frontend/blob/f065a57ee8f44104c37f3dcebd545d057128bbac/packages/stores/src/ui-config/trade-token-in-config.ts#L194-L220
 *
 * @param amount
 * @param outCurrency
 * @param pools
 * @returns RoutePathWithAmount
 */
export const getOsmosisRoutes = ({
  tokenInCurrency,
  tokenOutCurrency,
  amount: tokenInAmount,
  pools,
}: {
  tokenInCurrency: Currency;
  tokenOutCurrency: Currency;
  amount: string;
  pools: Pool[];
}): RoutePathWithAmount[] => {
  const amount: CoinPrimitive = {
    denom: tokenInCurrency.coinMinimalDenom,
    amount: tokenInAmount,
  };

  if (
    !amount.amount ||
    new Int(amount.amount).lte(new Int(0)) ||
    amount.denom === '_unknown' ||
    tokenOutCurrency.coinMinimalDenom === '_unknown'
  ) {
    return [];
  }

  try {
    return getOptimizedRoutesByTokenIn(
      { denom: amount.denom, amount: new Int(amount.amount) },
      tokenOutCurrency.coinMinimalDenom,
      5,
      pools,
    );
  } catch (e: any) {
    return [];
  }
};
