import { Bech32Address } from '@keplr-wallet/cosmos';
import { ChainInfo } from '@keplr-wallet/types';

type CustomChainConfig = ChainInfo & {
  explorerUrlToTx: string;
  contracts: {
    'ion-dao': {
      staking: string;
    };
  };
};

export const OSMOSIS_BLOCK_TIME = 5_900;

export const OSMOSIS_CHAIN_ID = 'osmosis-1';
const STAGED = {
  // TODO: Add testnet constants after contract deployment
  'osmosis-1': {
    rpc: 'https://rpc-osmosis.blockapsis.com',
    rest: 'https://lcd-osmosis.blockapsis.com',
    contracts: {
      'ion-dao': {
        staking:
          'osmo1yg8930mj8pk288lmkjex0qz85mj8wgtns5uzwyn2hs25pwdnw42sf745wc',
      },
    },
  },
};

export const OSMOSIS_CHAIN_CONFIG: CustomChainConfig = {
  ...STAGED[OSMOSIS_CHAIN_ID],
  chainId: OSMOSIS_CHAIN_ID,
  chainName: 'Osmosis',
  stakeCurrency: {
    coinDenom: 'OSMO',
    coinMinimalDenom: 'uosmo',
    coinDecimals: 6,
    coinGeckoId: 'osmosis',
  },
  bip44: {
    coinType: 118,
  },
  bech32Config: Bech32Address.defaultBech32Config('osmo'),
  currencies: [
    {
      coinDenom: 'OSMO',
      coinMinimalDenom: 'uosmo',
      coinDecimals: 6,
      coinGeckoId: 'osmosis',
    },
    {
      coinDenom: 'ION',
      coinMinimalDenom: 'uion',
      coinDecimals: 6,
      coinGeckoId: 'ion',
    },
  ],
  feeCurrencies: [
    {
      coinDenom: 'OSMO',
      coinMinimalDenom: 'uosmo',
      coinDecimals: 6,
      coinGeckoId: 'osmosis',
    },
  ],

  features: ['ibc-transfer', 'ibc-go'],
  explorerUrlToTx: 'https://www.mintscan.io/osmosis/txs/{txHash}',
};

export const OSMOSIS_DENOMS = OSMOSIS_CHAIN_CONFIG.currencies.map(
  (v) => v.coinDenom,
);
