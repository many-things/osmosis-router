import { AppCurrency } from '@keplr-wallet/types';
import {
  CoinPretty,
  Dec,
  DecUtils,
  Int,
  IntPretty,
  RatePretty,
} from '@keplr-wallet/unit';
import * as WeightedPoolMath from '@osmosis-labs/math';
import { NoPoolsError, NotEnoughLiquidityError } from '@osmosis-labs/pools';

import { Pool } from '../osmosis';

export interface RoutePath {
  pools: Pool[];
  tokenOutDenoms: string[];
  tokenInDenom: string;
}

export interface RoutePathWithAmount extends RoutePath {
  amount: Int;
}

export interface SwapPath {
  poolId: string;
  tokenOutCurrency: AppCurrency;
}

/**
 * Utils
 */

/**
 *
 * @param pool
 * @param denom
 * @returns
 */
const hasPoolAsset = (pool: Pool, denom: string): boolean => {
  const hasPool = pool.pool_assets.find((item) => item.token.denom === denom);
  return hasPool !== undefined;
};

const getLimitAmountByTokenIn = (pool: Pool, denom: string): Int => {
  const poolAsset = getPoolAsset(pool, denom);
  return poolAsset.amount.toDec().mul(new Dec('0.3')).truncate();
};

const getNormalizedLiquidity = ({
  pool,
  tokenInDenom,
  tokenOutDenom,
}: {
  pool: Pool;
  tokenInDenom: string;
  tokenOutDenom: string;
}): Dec => {
  const tokenIn = getPoolAsset(pool, tokenInDenom);
  const tokenOut = getPoolAsset(pool, tokenOutDenom);
  // todo
  // return new Dec("1");
  return tokenOut.amount
    .toDec()
    .mul(new Dec(tokenIn.weight))
    .quo(new Dec(tokenIn.weight).add(new Dec(tokenOut.weight)));
};
/**
 * Get Osmosis Swap Pool candidate
 * https://github.com/osmosis-labs/osmosis-frontend/blob/2ef79ce0b0c3f7350185f46f347438229ef10a56/packages/pools/src/routes.ts#L40-L213
 *
 * @param tokenInDenom
 * @param tokenOutDenom
 * @param permitIntermediate
 * @param pools
 * @returns RoutePath[]
 */
const getCandidatePaths = (
  tokenInDenom: string,
  tokenOutDenom: string,
  permitIntermediate: boolean,
  pools: Pool[],
): RoutePath[] => {
  if (pools.length === 0) {
    return [];
  }

  let filteredRoutePaths: RoutePath[] = [];

  // Key is denom.
  const multihopCandiateHasOnlyInIntermediates: Map<string, Pool[]> = new Map();
  const multihopCandiateHasOnlyOutIntermediates: Map<string, Pool[]> =
    new Map();

  pools.forEach((pool) => {
    const hasTokenIn = hasPoolAsset(pool, tokenInDenom);
    const hasTokenOut = hasPoolAsset(pool, tokenOutDenom);

    if (hasTokenIn && hasTokenOut) {
      // If the pool has both token in and token out, we can swap directly from this pool.
      filteredRoutePaths.push({
        pools: [pool],
        tokenOutDenoms: [tokenOutDenom],
        tokenInDenom,
      });
    } else {
      if (permitIntermediate && (hasTokenIn || hasTokenOut)) {
        pool.pool_assets.forEach((poolAsset) => {
          const { denom } = poolAsset.token;
          if (denom !== tokenInDenom && denom !== tokenOutDenom) {
            if (hasTokenIn) {
              const candiateData =
                multihopCandiateHasOnlyInIntermediates.get(denom);
              if (candiateData) {
                candiateData.push(pool);
                multihopCandiateHasOnlyInIntermediates.set(denom, candiateData);
              } else {
                multihopCandiateHasOnlyInIntermediates.set(denom, [pool]);
              }
            } else {
              const candiateData =
                multihopCandiateHasOnlyOutIntermediates.get(denom);
              if (candiateData) {
                candiateData.push(pool);
                multihopCandiateHasOnlyOutIntermediates.set(
                  denom,
                  candiateData,
                );
              } else {
                multihopCandiateHasOnlyOutIntermediates.set(denom, [pool]);
              }
            }
          }
        });
      }
    }
  });

  // This method is actually used to calculate an optimized routes.
  // In the case of overlapping pools in the optimized route,
  // it is difficult because the change of the pool by each swap should be calculated in advance...
  // So, make sure that the pools do not overlap.
  // Key is pool id
  const usedFirstPoolMap: Map<string, boolean> = new Map();
  // Key is pool id
  const usedSecondPoolMap: Map<string, boolean> = new Map();

  multihopCandiateHasOnlyInIntermediates.forEach(
    (hasOnlyInPools, intermediateDenom) => {
      const hasOnlyOutIntermediates =
        multihopCandiateHasOnlyOutIntermediates.get(intermediateDenom);
      if (hasOnlyOutIntermediates) {
        let highestNormalizedLiquidityFirst = new Dec(0);
        let highestNormalizedLiquidityFirstPool: Pool | undefined;

        hasOnlyInPools.forEach((pool) => {
          if (!usedFirstPoolMap.get(pool.id)) {
            const normalizedLiquidity = getNormalizedLiquidity({
              pool,
              tokenInDenom,
              tokenOutDenom: intermediateDenom,
            });
            if (normalizedLiquidity.gte(highestNormalizedLiquidityFirst)) {
              highestNormalizedLiquidityFirst = normalizedLiquidity;
              highestNormalizedLiquidityFirstPool = pool;
            }
          }
        });

        if (
          highestNormalizedLiquidityFirst.isPositive() &&
          highestNormalizedLiquidityFirstPool
        ) {
          let highestNormalizedLiquiditySecond = new Dec(0);
          let highestNormalizedLiquiditySecondPool: Pool | undefined;

          hasOnlyOutIntermediates.forEach((pool) => {
            if (!usedSecondPoolMap.get(pool.id)) {
              const normalizedLiquidity = getNormalizedLiquidity({
                pool,
                tokenInDenom: intermediateDenom,
                tokenOutDenom,
              });
              if (normalizedLiquidity.gte(highestNormalizedLiquiditySecond)) {
                highestNormalizedLiquiditySecond = normalizedLiquidity;
                highestNormalizedLiquiditySecondPool = pool;
              }
            }
          });

          if (
            highestNormalizedLiquiditySecond.isPositive() &&
            highestNormalizedLiquiditySecondPool
          ) {
            usedFirstPoolMap.set(highestNormalizedLiquidityFirstPool.id, true);
            usedSecondPoolMap.set(
              highestNormalizedLiquiditySecondPool.id,
              true,
            );
            filteredRoutePaths.push({
              pools: [
                highestNormalizedLiquidityFirstPool,
                highestNormalizedLiquiditySecondPool,
              ],
              tokenOutDenoms: [intermediateDenom, tokenOutDenom],
              tokenInDenom,
            });
          }
        }
      }
    },
  );

  // filteredRoutePaths = filteredRoutePaths.sort((path1, path2) => {
  //   // Priority is given to direct swap.
  //   // For direct swap, sort by normalized liquidity.
  //   // In case of multihop swap, sort by first normalized liquidity.

  //   const path1IsDirect = path1.pools.length === 1;
  //   const path2IsDirect = path2.pools.length === 1;
  //   if (!path1IsDirect || !path2IsDirect) {
  //     return path1IsDirect ? -1 : 1;
  //   }

  //   const path1NormalizedLiquidity = getNormalizedLiquidity({
  //     pool: path1.pools[0],
  //     tokenInDenom,
  //     tokenOutDenom: path1.tokenOutDenoms[0],
  //   });
  //   const path2NormalizedLiquidity = getNormalizedLiquidity({
  //     pool: path2.pools[0],
  //     tokenInDenom,
  //     tokenOutDenom: path2.tokenOutDenoms[0],
  //   });

  //   return path1NormalizedLiquidity.gte(path2NormalizedLiquidity) ? -1 : 1;
  // });

  return filteredRoutePaths;
};

/**
 * Get Optimized Osmosis Swap path
 * https://github.com/osmosis-labs/osmosis-frontend/blob/2ef79ce0b0c3f7350185f46f347438229ef10a56/packages/pools/src/routes.ts#L215-L270
 *
 * @param tokenIn
 * @param tokenOutDenom
 * @param maxPools
 * @param pools
 * @returns RoutePathWithAmount[]
 */
const getOptimizedRoutesByTokenIn = (
  tokenIn: {
    denom: string;
    amount: Int;
  },
  tokenOutDenom: string,
  maxPools: number,
  pools: Pool[],
): RoutePathWithAmount[] => {
  if (!tokenIn.amount.isPositive()) {
    throw new Error('Token in amount is zero or negative');
  }

  let paths = getCandidatePaths(tokenIn.denom, tokenOutDenom, true, pools);
  // TODO: if paths is single pool - confirm enough liquidity otherwise find different route
  if (paths.length === 0) {
    throw new NoPoolsError();
  }

  paths = paths.slice(0, maxPools);

  const initialSwapAmounts: Int[] = [];
  let totalLimitAmount = new Int(0);

  for (const path of paths) {
    const limitAmount = getLimitAmountByTokenIn(path.pools[0], tokenIn.denom);

    totalLimitAmount = totalLimitAmount.add(limitAmount);

    if (totalLimitAmount.lt(tokenIn.amount)) {
      initialSwapAmounts.push(limitAmount);
    } else {
      let sumInitialSwapAmounts = new Int(0);
      for (const initialSwapAmount of initialSwapAmounts) {
        sumInitialSwapAmounts = sumInitialSwapAmounts.add(initialSwapAmount);
      }

      const diff = tokenIn.amount.sub(sumInitialSwapAmounts);
      initialSwapAmounts.push(diff);

      break;
    }
  }

  // No enough liquidity
  if (totalLimitAmount.lt(tokenIn.amount)) {
    throw new NotEnoughLiquidityError();
  }

  // TODO: ...

  return initialSwapAmounts.map((amount, i) => {
    return {
      ...paths[i],
      amount,
    };
  });
};

export interface CoinPrimitive {
  denom: string;
  amount: string;
}

/**
 * Get optimized swap route path from given pool
 * https://github.com/osmosis-labs/osmosis-frontend/blob/f065a57ee8f44104c37f3dcebd545d057128bbac/packages/stores/src/ui-config/trade-token-in-config.ts#L194-L220
 *
 * @param amount
 * @param outCurrency
 * @param pools
 * @returns RoutePathWithAmount
 */
export const getOptimizedRoutePaths = (
  amount: CoinPrimitive,
  outCurrency: AppCurrency,
  pools: Pool[],
): RoutePathWithAmount[] => {
  if (
    !amount.amount ||
    new Int(amount.amount).lte(new Int(0)) ||
    amount.denom === '_unknown' ||
    outCurrency.coinMinimalDenom === '_unknown'
  ) {
    return [];
  }

  try {
    return getOptimizedRoutesByTokenIn(
      {
        denom: amount.denom,
        amount: new Int(amount.amount),
      },
      outCurrency.coinMinimalDenom,
      5,
      pools,
    );
  } catch (e: any) {
    return [];
  }
};

const getPoolAsset = (
  pool: Pool,
  denom: string,
): { denom: string; amount: Int; weight: Int } => {
  const poolAsset = pool.pool_assets.find(
    (asset) => asset.token.denom === denom,
  );
  if (!poolAsset) {
    throw new Error(`Pool ${pool.id} doesn't have the pool asset for ${denom}`);
  }

  return {
    denom: poolAsset.token.denom,
    amount: new Int(poolAsset.token.amount),
    weight: new Int(poolAsset.weight),
  };
};

const getTokenOutByTokenIn = (
  pool: Pool,
  swapFee: Dec,
  tokenIn: { denom: string; amount: Int },
  tokenOutDenom: string,
): {
  amount: Int;
  beforeSpotPriceInOverOut: Dec;
  beforeSpotPriceOutOverIn: Dec;
  afterSpotPriceInOverOut: Dec;
  afterSpotPriceOutOverIn: Dec;
  effectivePriceInOverOut: Dec;
  effectivePriceOutOverIn: Dec;
  priceImpact: Dec;
} => {
  const inPoolAsset = getPoolAsset(pool, tokenIn.denom);
  const outPoolAsset = getPoolAsset(pool, tokenOutDenom);

  const beforeSpotPriceInOverOut = WeightedPoolMath.calcSpotPrice(
    new Dec(inPoolAsset.amount),
    new Dec(inPoolAsset.weight),
    new Dec(outPoolAsset.amount),
    new Dec(outPoolAsset.weight),
    swapFee,
  );

  const tokenOutAmount = WeightedPoolMath.calcOutGivenIn(
    new Dec(inPoolAsset.amount),
    new Dec(inPoolAsset.weight),
    new Dec(outPoolAsset.amount),
    new Dec(outPoolAsset.weight),
    new Dec(tokenIn.amount),
    swapFee,
  ).truncate();

  if (tokenOutAmount.equals(new Int(0))) {
    return {
      amount: new Int(0),
      beforeSpotPriceInOverOut: new Dec(0),
      beforeSpotPriceOutOverIn: new Dec(0),
      afterSpotPriceInOverOut: new Dec(0),
      afterSpotPriceOutOverIn: new Dec(0),
      effectivePriceInOverOut: new Dec(0),
      effectivePriceOutOverIn: new Dec(0),
      priceImpact: new Dec(0),
    };
  }

  const afterSpotPriceInOverOut = WeightedPoolMath.calcSpotPrice(
    new Dec(inPoolAsset.amount).add(new Dec(tokenIn.amount)),
    new Dec(inPoolAsset.weight),
    new Dec(outPoolAsset.amount).sub(new Dec(tokenOutAmount)),
    new Dec(outPoolAsset.weight),
    swapFee,
  );

  if (afterSpotPriceInOverOut.lt(beforeSpotPriceInOverOut)) {
    throw new Error("Spot price can't be decreased after swap");
  }

  const effectivePrice = new Dec(tokenIn.amount).quo(new Dec(tokenOutAmount));
  const priceImpact = effectivePrice
    .quo(beforeSpotPriceInOverOut)
    .sub(new Dec('1'));

  return {
    amount: tokenOutAmount,
    beforeSpotPriceInOverOut,
    beforeSpotPriceOutOverIn: new Dec(1).quoTruncate(beforeSpotPriceInOverOut),
    afterSpotPriceInOverOut,
    afterSpotPriceOutOverIn: new Dec(1).quoTruncate(afterSpotPriceInOverOut),
    effectivePriceInOverOut: effectivePrice,
    effectivePriceOutOverIn: new Dec(1).quoTruncate(effectivePrice),
    priceImpact,
  };
};

// const getTokenOutByTokenInComputedFn = (
//   pool: Pool,
//   swapFee: Dec,
//   tokenInDenom: string,
//   tokenInAmount: string,
//   tokenOutDenom: string,
// ): {
//   amount: CoinPretty;
//   afterSpotPriceInOverOut: IntPretty;
//   afterSpotPriceOutOverIn: IntPretty;
//   effectivePriceInOverOut: IntPretty;
//   effectivePriceOutOverIn: IntPretty;
//   priceImpact: RatePretty;
// } => {
//   // computedFn(
//   // (tokenInDenom: string, tokenInAmount: string, tokenOutDenom: string) => {
//   const result = getTokenOutByTokenIn(
//     pool,
//     swapFee,
//     {
//       denom: tokenInDenom,
//       amount: new Int(tokenInAmount),
//     },
//     tokenOutDenom,
//   );

//   // const chainInfo = this.chainGetter.getChain(this.chainId);
//   const outCurrency = chainInfo.forceFindCurrency(tokenOutDenom);

//   const spotPriceInOverOutMul = DecUtils.getTenExponentN(
//     outCurrency.coinDecimals -
//       chainInfo.forceFindCurrency(tokenInDenom).coinDecimals,
//   );

//   return {
//     amount: new CoinPretty(outCurrency, result.amount),
//     afterSpotPriceInOverOut: new IntPretty(
//       result.afterSpotPriceInOverOut.mulTruncate(spotPriceInOverOutMul),
//     ),
//     afterSpotPriceOutOverIn: new IntPretty(
//       result.afterSpotPriceOutOverIn.quoTruncate(spotPriceInOverOutMul),
//     ),
//     effectivePriceInOverOut: new IntPretty(
//       result.effectivePriceInOverOut.mulTruncate(spotPriceInOverOutMul),
//     ),
//     effectivePriceOutOverIn: new IntPretty(
//       result.effectivePriceOutOverIn.quoTruncate(spotPriceInOverOutMul),
//     ),
//     priceImpact: new RatePretty(result.priceImpact),
//   };
// };
// // );

export const calculateTokenOutByTokenIn = (
  paths: RoutePathWithAmount[],
): {
  amount: Int;
  beforeSpotPriceInOverOut: Dec;
  beforeSpotPriceOutOverIn: Dec;
  afterSpotPriceInOverOut: Dec;
  afterSpotPriceOutOverIn: Dec;
  effectivePriceInOverOut: Dec;
  effectivePriceOutOverIn: Dec;
  tokenInFeeAmount: Int;
  swapFee: Dec;
  priceImpact: Dec;
} => {
  if (paths.length === 0) {
    throw new Error('Paths are empty');
  }

  let totalOutAmount: Int = new Int(0);
  let totalBeforeSpotPriceInOverOut: Dec = new Dec(0);
  let totalAfterSpotPriceInOverOut: Dec = new Dec(0);
  let totalEffectivePriceInOverOut: Dec = new Dec(0);
  let totalSwapFee: Dec = new Dec(0);

  let sumAmount = new Int(0);
  for (const path of paths) {
    sumAmount = sumAmount.add(path.amount);
  }

  let outDenom: string | undefined;
  for (const path of paths) {
    if (
      path.pools.length !== path.tokenOutDenoms.length ||
      path.pools.length === 0
    ) {
      throw new Error('Invalid path');
    }

    if (!outDenom) {
      outDenom = path.tokenOutDenoms[path.tokenOutDenoms.length - 1];
    } else if (
      outDenom !== path.tokenOutDenoms[path.tokenOutDenoms.length - 1]
    ) {
      throw new Error('Paths have different out denom');
    }

    const amountFraction = path.amount.toDec().quoTruncate(sumAmount.toDec());

    let previousInDenom = path.tokenInDenom;
    let previousInAmount = path.amount;

    let beforeSpotPriceInOverOut: Dec = new Dec(1);
    let afterSpotPriceInOverOut: Dec = new Dec(1);
    let effectivePriceInOverOut: Dec = new Dec(1);
    let swapFee: Dec = new Dec(0);

    for (let i = 0; i < path.pools.length; i++) {
      const pool = path.pools[i];
      const outDenom = path.tokenOutDenoms[i];

      const poolSwapFee = new Dec(pool.pool_params.swap_fee);

      // less fee
      const tokenOut = getTokenOutByTokenIn(
        pool,
        poolSwapFee,
        { denom: previousInDenom, amount: previousInAmount },
        outDenom,
      );

      if (!tokenOut.amount.gt(new Int(0))) {
        // not enough liquidity
        console.warn('Token out is 0 through pool: ', pool.id);
        return {
          ...tokenOut,
          tokenInFeeAmount: new Int(0),
          swapFee: poolSwapFee,
        };
      }

      beforeSpotPriceInOverOut = beforeSpotPriceInOverOut.mulTruncate(
        tokenOut.beforeSpotPriceInOverOut,
      );
      afterSpotPriceInOverOut = afterSpotPriceInOverOut.mulTruncate(
        tokenOut.afterSpotPriceInOverOut,
      );
      effectivePriceInOverOut = effectivePriceInOverOut.mulTruncate(
        tokenOut.effectivePriceInOverOut,
      );
      swapFee = swapFee.add(new Dec(1).sub(swapFee).mulTruncate(poolSwapFee));

      if (i === path.pools.length - 1) {
        totalOutAmount = totalOutAmount.add(tokenOut.amount);

        totalBeforeSpotPriceInOverOut = totalBeforeSpotPriceInOverOut.add(
          beforeSpotPriceInOverOut.mulTruncate(amountFraction),
        );
        totalAfterSpotPriceInOverOut = totalAfterSpotPriceInOverOut.add(
          afterSpotPriceInOverOut.mulTruncate(amountFraction),
        );
        totalEffectivePriceInOverOut = totalEffectivePriceInOverOut.add(
          effectivePriceInOverOut.mulTruncate(amountFraction),
        );
        totalSwapFee = totalSwapFee.add(swapFee.mulTruncate(amountFraction));
      } else {
        previousInDenom = outDenom;
        previousInAmount = tokenOut.amount;
      }
    }
  }

  const priceImpact = totalEffectivePriceInOverOut
    .quo(totalBeforeSpotPriceInOverOut)
    .sub(new Dec('1'));

  return {
    amount: totalOutAmount,
    beforeSpotPriceInOverOut: totalBeforeSpotPriceInOverOut,
    beforeSpotPriceOutOverIn: new Dec(1).quoTruncate(
      totalBeforeSpotPriceInOverOut,
    ),
    afterSpotPriceInOverOut: totalAfterSpotPriceInOverOut,
    afterSpotPriceOutOverIn: new Dec(1).quoTruncate(
      totalAfterSpotPriceInOverOut,
    ),
    effectivePriceInOverOut: totalEffectivePriceInOverOut,
    effectivePriceOutOverIn: new Dec(1).quoTruncate(
      totalEffectivePriceInOverOut,
    ),
    tokenInFeeAmount: sumAmount.sub(
      new Dec(sumAmount).mulTruncate(new Dec(1).sub(totalSwapFee)).round(),
    ),
    swapFee: totalSwapFee,
    priceImpact,
  };
};
