import { Dec, DecUtils } from '@keplr-wallet/unit';
import { Pool } from '@many-things/cosmos-query/dist/apis/osmosis/gamm/types';
import React, { useEffect } from 'react';
import styled from 'styled-components';

const HomePage = () => {
  useEffect(() => {
    const fetch = async () => {
      const [
        { getOsmosisQuery },
        { estimateMultihopSwapExactAmountIn },
        { OSMOSIS_CHAIN_CONFIG },
        { getOsmosisRoutes },
      ] = await Promise.all([
        import('@many-things/cosmos-query'),
        import('@osmosis-labs/math'),
        import('@/osmosis/chain'),
        import('@/osmosis'),
      ]);
      const { getPools, getNumPools } = getOsmosisQuery(
        OSMOSIS_CHAIN_CONFIG.rest,
      );
      const { num_pools } = (await getNumPools()) as unknown as {
        num_pools: string;
      };
      const numberOfPools = parseInt(num_pools);

      const promises: Promise<Pool[]>[] = [];
      for (let i = 0; i < numberOfPools; i += 100) {
        promises.push(
          getPools({
            pagination: {
              offset: i,
              limit: 100,
            },
          }).then((res) => res.pools),
        );
      }
      const pools = (await Promise.all(promises)).flat();

      const amount = '1';
      const routes = await getOsmosisRoutes({
        tokenIn: {
          currency: {
            coinDenom: 'OSMO',
            coinMinimalDenom: 'uosmo',
            coinDecimals: 6,
          },
          amount,
        },
        tokenOutCurrency: {
          coinDenom: 'USDC',
          coinMinimalDenom:
            'ibc/D189335C6E4A68B513C10AB227BF1C1D38C746766278BA3EEB4FB14124F1D858',
          coinDecimals: 6,
        },
        pools,
      });
      console.log({ routes });

      const result = estimateMultihopSwapExactAmountIn(
        {
          currency: {
            coinDenom: 'OSMO',
            coinMinimalDenom: 'uosmo',
            coinDecimals: 6,
          },
          amount: new Dec(amount)
            .mul(
              DecUtils.getTenExponentNInPrecisionRange(
                // tokenIn.currency.coinDecimals
                6,
              ),
            )
            .truncate()
            .toString(),
        },
        routes,
      );
      console.log({ result });
      console.log(
        result.tokenOut
          // .moveDecimalPointRight(tokenOutCurrency.coinDecimals)
          .moveDecimalPointLeft(6)
          .toString(),
      );
    };

    fetch();
  }, []);
  return <Container />;
};

export default HomePage;

const Container = styled.div``;
