import { Currency } from '@keplr-wallet/types';

import { estimateSwap } from '../estimate-swap';

const tokenInCurrency: Record<'OSMO' | 'ATOM', Currency> = {
  OSMO: {
    coinDenom: 'OSMO',
    coinMinimalDenom: 'uosmo',
    coinDecimals: 6,
  },
  ATOM: {
    coinDenom: 'ATOM',
    coinMinimalDenom:
      'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
    coinDecimals: 6,
  },
};
const tokenOutCurrency: Currency = {
  coinDenom: 'USDC',
  coinMinimalDenom:
    'ibc/D189335C6E4A68B513C10AB227BF1C1D38C746766278BA3EEB4FB14124F1D858',
  coinDecimals: 6,
};

const main = async () => {
  let amount = await estimateSwap(
    tokenInCurrency.OSMO,
    tokenOutCurrency,
    '1000000',
  );
  console.log('OSMO', amount.toString());

  amount = await estimateSwap(
    tokenInCurrency.ATOM,
    tokenOutCurrency,
    '1000000',
  );
  console.log('ATOM', amount.toString());
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
