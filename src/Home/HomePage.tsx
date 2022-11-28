import { CoinPretty, Dec } from '@keplr-wallet/unit';
import React, { useEffect, useState } from 'react';
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

const getSwapEstimation = async () => {
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
  return tokenOut;
};

const HomePage = () => {
  const [tokenOut, setTokenOut] = useState<CoinPretty | undefined>(undefined);

  useEffect(() => {
    getSwapEstimation().then(setTokenOut);
  }, []);

  return (
    <Container>
      <h1>
        {new CoinPretty(
          tokenIn.currency,
          new Dec(
            parseInt(tokenIn.amount) * 10 ** tokenIn.currency.coinDecimals,
          ),
        ).toLocaleString()}
      </h1>
      <p>⬇</p>
      <h1>{!tokenOut ? '-' : tokenOut.toLocaleString()}</h1>
    </Container>
  );
};

export default HomePage;

const Container = styled.div`
  margin-top: 64px;

  h1,
  p {
    text-align: center;
    font-size: 2rem;
  }

  p {
    margin: 16px 0;
  }
`;
