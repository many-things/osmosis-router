import { getOsmosisRoutes } from '@/osmosis';
import { OSMOSIS_CHAIN_CONFIG } from '@/osmosis/chain';
import { getOsmosisQuery } from '@many-things/cosmos-query';
import { Pool } from '@many-things/cosmos-query/dist/apis/osmosis/gamm/types';
import React, { useEffect } from 'react';
import styled from 'styled-components';

const HomePage = () => {

useEffect(() => {
  const fetch = async () => {
    const { getPools, getNumPools } = getOsmosisQuery(OSMOSIS_CHAIN_CONFIG.rest);
    const { num_pools } = (await getNumPools()) as unknown as { num_pools: string }
    const numberOfPools = parseInt(num_pools)

    const promises: Promise<Pool[]>[] = []
    for (let i = 0; i < numberOfPools; i += 100) {
      promises.push(getPools({ pagination: {
        offset: i, limit: 100} }).then(res => res.pools));
    }
    const pools = (await Promise.all(promises)).flat()

    console.log(pools.length)
    const routes = await getOsmosisRoutes({
      tokenIn: {
        currency: {
          coinDenom: "OSMO",
          coinMinimalDenom: "uosmo",
          coinDecimals: 6,
        },
        amount: '1',
      },
      tokenOutCurrency: {
        coinDenom: "USDC",
        coinMinimalDenom: "ibc/D189335C6E4A68B513C10AB227BF1C1D38C746766278BA3EEB4FB14124F1D858",
        coinDecimals: 6,
      },
      pools
    })
    console.log({routes})
  }

  fetch()
}, [])
  return <Container />;
};

export default HomePage;

const Container = styled.div``;
