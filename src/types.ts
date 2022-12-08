import { Int } from '@keplr-wallet/unit';

import { Pool } from './osmosis';

export { type Pool } from './osmosis';

export interface RoutePath {
  pools: Pool[];
  tokenOutDenoms: string[];
  tokenInDenom: string;
}

export interface RoutePathWithAmount extends RoutePath {
  amount: Int;
}
