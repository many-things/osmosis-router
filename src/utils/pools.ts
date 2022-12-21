import { Dec, Int } from '@keplr-wallet/unit';
import { WeightedPoolMath } from '@osmosis-labs/math';
import { NoPoolsError } from '@osmosis-labs/pools';

import { Pool } from '../osmosis';
import { RoutePath, RoutePathWithAmount } from '../types';

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
  const hasPool = pool.pool_assets?.find((item) => item.token.denom === denom);
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
        pool.pool_assets?.forEach((poolAsset) => {
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

  return filteredRoutePaths;
};

export class NotEnoughLiquidityError extends Error {
  constructor(params: {
    tokenInDenom: string;
    tokenOutDenom: string;
    paths: RoutePath[];
  }) {
    const message = 'Not enough liquidity';
    console.debug('', params);
    super(message);
    Object.setPrototypeOf(this, NoPoolsError.prototype);
  }
}

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
export const getOptimizedRoutesByTokenIn = (
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
    console.debug({ paths, tokenIn, tokenOutDenom });
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
    throw new NotEnoughLiquidityError({
      tokenInDenom: tokenIn.denom,
      tokenOutDenom,
      paths,
    });
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

const getPoolAsset = (
  pool: Pool,
  denom: string,
): { denom: string; amount: Int; weight: Int } => {
  const poolAsset = pool.pool_assets?.find(
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
): Int => {
  const inPoolAsset = getPoolAsset(pool, tokenIn.denom);
  const outPoolAsset = getPoolAsset(pool, tokenOutDenom);

  const tokenOutAmount = WeightedPoolMath.calcOutGivenIn(
    new Dec(inPoolAsset.amount),
    new Dec(inPoolAsset.weight),
    new Dec(outPoolAsset.amount),
    new Dec(outPoolAsset.weight),
    new Dec(tokenIn.amount),
    swapFee,
  ).truncate();

  if (tokenOutAmount.equals(new Int(0) as any)) {
    return new Int(0);
  }

  return tokenOutAmount as any;
};

export const calculateTokenOutByTokenIn = (
  paths: RoutePathWithAmount[],
): Int => {
  if (paths.length === 0) {
    throw new Error('Paths are empty');
  }

  let totalOutAmount: Int = new Int(0);

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

    let previousInDenom = path.tokenInDenom;
    let previousInAmount = path.amount;

    for (let i = 0; i < path.pools.length; i++) {
      const pool = path.pools[i];
      const outDenom = path.tokenOutDenoms[i];

      const poolSwapFee = new Dec(pool.pool_params.swap_fee);

      // less fee
      const tokenOutAmount = getTokenOutByTokenIn(
        pool,
        poolSwapFee,
        { denom: previousInDenom, amount: previousInAmount },
        outDenom,
      );

      if (!tokenOutAmount.gt(new Int(0))) {
        // not enough liquidity
        console.warn('Token out is 0 through pool: ', pool.id);
        return tokenOutAmount;
      }

      if (i === path.pools.length - 1) {
        totalOutAmount = totalOutAmount.add(tokenOutAmount);
      } else {
        previousInDenom = outDenom;
        previousInAmount = tokenOutAmount;
      }
    }
  }

  return totalOutAmount;
};
