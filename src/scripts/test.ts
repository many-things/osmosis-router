import { Currency } from '@keplr-wallet/types';

import { estimateSwap } from '../estimate-swap';

const tokenInCurrency: Currency = {
  coinDenom: 'OSMO',
  coinMinimalDenom: 'uosmo',
  coinDecimals: 6,
};
const tokenOutCurrency: Currency = {
  coinDenom: 'USDC',
  coinMinimalDenom:
    'ibc/D189335C6E4A68B513C10AB227BF1C1D38C746766278BA3EEB4FB14124F1D858',
  coinDecimals: 6,
};

const main = async () => {
  const value = await estimateSwap(tokenInCurrency, tokenOutCurrency, '1');
  console.group(value);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
