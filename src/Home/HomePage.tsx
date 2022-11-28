import React, { useEffect } from 'react';
import styled from 'styled-components';

const tokenIn = {
  currency: {
    coinDenom: 'OSMO',
    coinMinimalDenom: 'uosmo',
    coinDecimals: 6,
  },
  amount: '1',
};
const tokenOutCurrency = {
  coinDenom: 'USDC',
  coinMinimalDenom:
    'ibc/D189335C6E4A68B513C10AB227BF1C1D38C746766278BA3EEB4FB14124F1D858',
  coinDecimals: 6,
};

const HomePage = () => {
  useEffect(() => {
    const fetch = async () => {
      const [
        { getOsmosisPools },
        { getOsmosisRoutes },
        { getOsmosisSwapEstimation },
      ] = await Promise.all([
        import('@/osmosis/get-pools'),
        import('@/osmosis/get-routes'),
        import('@/osmosis/get-estimation'),
      ]);
      const pools = await getOsmosisPools();

      const routes = await getOsmosisRoutes({
        tokenIn,
        tokenOutCurrency,
        pools,
      });

      const tokenOut = getOsmosisSwapEstimation(
        tokenIn.currency,
        routes,
        tokenIn.amount,
      );
      console.log(tokenOut.toString());
    };

    fetch();
  }, []);
  return <Container />;
};

export default HomePage;

const Container = styled.div``;
