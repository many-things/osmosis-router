import { Currency } from '@keplr-wallet/types';
import { Dec, DecUtils } from '@keplr-wallet/unit';
import { estimateMultihopSwapExactAmountIn } from '@osmosis-labs/math';

import { Route } from './types';

export const getOsmosisSwapEstimation = (
  tokenInCurrency: Currency,
  routes: Route[],
  amount: string,
) => {
  const tokenOutCurrency = routes.at(-1).tokenOutCurrency;
  const result = estimateMultihopSwapExactAmountIn(
    {
      currency: tokenInCurrency,
      amount: new Dec(amount)
        .mul(
          DecUtils.getTenExponentNInPrecisionRange(
            tokenInCurrency.coinDecimals,
          ),
        )
        .truncate()
        .toString(),
    },
    routes,
  );
  return result.tokenOut.moveDecimalPointLeft(tokenOutCurrency.coinDecimals);
};
