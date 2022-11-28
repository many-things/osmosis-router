import { Currency } from '@keplr-wallet/types';
import { Dec, Int } from '@keplr-wallet/unit';

export type Route = {
  pool: {
    inPoolAsset: {
      coinDecimals: number;
      coinMinimalDenom: string;
      amount: Int;
      weight: Int;
    };
    outPoolAsset: {
      amount: Int;
      weight: Int;
    };
    swapFee: Dec;
  };
  tokenOutCurrency: Currency;
};
