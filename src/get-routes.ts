import { Currency } from '@keplr-wallet/types';
import {
  CoinPretty,
  Dec,
  DecUtils,
  Int,
  IntPretty,
  RatePretty,
} from '@keplr-wallet/unit';
import { OptimizedRoutes, Pool as OsmosisPool } from '@osmosis-labs/pools';

import { Pool } from './osmosis';
import { Route } from './types';
import {
  CoinPrimitive,
  calculateTokenOutByTokenIn,
  getOptimizedRoutePaths,
} from './utils/pools';

export const sendCurrency: Currency = {
  coinDenom: 'OSMO',
  coinMinimalDenom: 'uosmo',
  coinDecimals: 6,
};

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
}) => {
  if (pools === undefined || pools.length === 0) {
    throw 'Pool is undefined';
  }

  const amount: CoinPrimitive = {
    denom: tokenInCurrency.coinMinimalDenom,
    amount: tokenInAmount,
  };

  const paths = getOptimizedRoutePaths(amount, tokenOutCurrency, pools);
  const zero = {
    amount: new CoinPretty(tokenOutCurrency, new Dec(0)).ready(false),
    beforeSpotPriceWithoutSwapFeeInOverOut: new IntPretty(0).ready(false),
    beforeSpotPriceWithoutSwapFeeOutOverIn: new IntPretty(0),
    beforeSpotPriceInOverOut: new IntPretty(0).ready(false),
    beforeSpotPriceOutOverIn: new IntPretty(0).ready(false),
    afterSpotPriceInOverOut: new IntPretty(0).ready(false),
    afterSpotPriceOutOverIn: new IntPretty(0).ready(false),
    effectivePriceInOverOut: new IntPretty(0).ready(false),
    effectivePriceOutOverIn: new IntPretty(0).ready(false),
    tokenInFeeAmount: new CoinPretty(sendCurrency, new Dec(0)).ready(false),
    swapFee: new RatePretty(0).ready(false),
    priceImpact: new RatePretty(0).ready(false),
  };

  if (paths.length === 0) {
    return zero;
  }

  const multiplicationInOverOut = DecUtils.getTenExponentN(
    tokenOutCurrency.coinDecimals - sendCurrency.coinDecimals,
  );
  const result = calculateTokenOutByTokenIn(paths);

  if (!result.amount.gt(new Int(0))) {
    // setError(new Error('Not enough liquidity'));
    return zero;
  }

  const beforeSpotPriceWithoutSwapFeeInOverOutDec =
    result.beforeSpotPriceInOverOut.mulTruncate(new Dec(1).sub(result.swapFee));

  return {
    amount: new CoinPretty(tokenOutCurrency, result.amount).locale(false),
    beforeSpotPriceWithoutSwapFeeInOverOut: new IntPretty(
      beforeSpotPriceWithoutSwapFeeInOverOutDec.mulTruncate(
        multiplicationInOverOut,
      ),
    ),
    beforeSpotPriceWithoutSwapFeeOutOverIn:
      beforeSpotPriceWithoutSwapFeeInOverOutDec.gt(new Dec(0)) &&
      multiplicationInOverOut.gt(new Dec(0))
        ? new IntPretty(
            new Dec(1)
              .quoTruncate(beforeSpotPriceWithoutSwapFeeInOverOutDec)
              .quoTruncate(multiplicationInOverOut),
          )
        : new IntPretty(0),
    beforeSpotPriceInOverOut: new IntPretty(
      result.beforeSpotPriceInOverOut.mulTruncate(multiplicationInOverOut),
    ),
    beforeSpotPriceOutOverIn: multiplicationInOverOut.gt(new Dec(0))
      ? new IntPretty(
          result.beforeSpotPriceOutOverIn.quoTruncate(multiplicationInOverOut),
        )
      : new IntPretty(0),
    afterSpotPriceInOverOut: new IntPretty(
      result.afterSpotPriceInOverOut.mulTruncate(multiplicationInOverOut),
    ),
    afterSpotPriceOutOverIn: multiplicationInOverOut.gt(new Dec(0))
      ? new IntPretty(
          result.afterSpotPriceOutOverIn.quoTruncate(multiplicationInOverOut),
        )
      : new IntPretty(0),
    effectivePriceInOverOut: new IntPretty(
      result.effectivePriceInOverOut.mulTruncate(multiplicationInOverOut),
    ),
    effectivePriceOutOverIn: multiplicationInOverOut.gt(new Dec(0))
      ? new IntPretty(
          result.effectivePriceOutOverIn.quoTruncate(multiplicationInOverOut),
        )
      : new IntPretty(0),
    tokenInFeeAmount: new CoinPretty(
      sendCurrency,
      result.tokenInFeeAmount,
    ).locale(false),
    swapFee: new RatePretty(result.swapFee),
    priceImpact: new RatePretty(result.priceImpact),
  };
};
