import { Currency } from '@keplr-wallet/types';
import Axios from 'axios';

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
  coinDenom: 'OSMO',
  coinMinimalDenom: 'uosmo',
  coinDecimals: 6,
};

const instance = Axios.create({
  baseURL: 'https://osmosis-testnet-rpc.allthatnode.com:1317',
});

const main = async () => {
  let amount = await estimateSwap(
    tokenInCurrency.OSMO,
    tokenOutCurrency,
    '1000000',
    undefined,
    instance,
  );
  console.log('OSMO', amount.toString());

  amount = await estimateSwap(
    tokenInCurrency.ATOM,
    tokenOutCurrency,
    '1000000',
    undefined,
    instance,
  );
  console.log('ATOM', amount.toString());
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
