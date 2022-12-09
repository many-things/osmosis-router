import Axios from 'axios';

import { OSMOSIS_CHAIN_REST } from './constants';

export interface Coin {
  denom: string;
  amount: string;
}
export interface Pool {
  '@type': string;
  address: string;
  id: string;
  pool_params: {
    lock: boolean;
    swap_fee: string;
    exitFee: string;
    smooth_weight_change_params: {
      start_time: string;
      duration: string;
      initial_pool_weights: {
        token: Coin;
        weight: string;
      }[];
      target_pool_weights: {
        token: Coin;
        weight: string;
      }[];
    } | null;
  };
  future_pool_governor: string;
  total_weight: string;
  total_shares: Coin;
  pool_assets:
    | {
        weight: string;
        token: Coin;
      }[]
    | undefined;
}
export interface NumPoolsResponse {
  num_pools: string;
}
export type OsmosisPaginationParams =
  | {
      key?: string;
      offset?: number;
      limit?: number;
      count_total?: boolean;
    }
  | undefined;
export interface PaginationResponse {
  next_key: string | null;
  total: string;
}
export interface PoolsResponse {
  pools: Pool[];
  pagination: PaginationResponse;
}

const instance = Axios.create({
  baseURL: OSMOSIS_CHAIN_REST,
});

export const getNumPools = async (): Promise<NumPoolsResponse> => {
  return (await instance.get('/osmosis/gamm/v1beta1/num_pools')).data;
};

export const getPools = async ({
  pagination,
}: {
  pagination?: OsmosisPaginationParams;
}): Promise<PoolsResponse> => {
  return (
    await instance.get('/osmosis/gamm/v1beta1/pools', {
      params: {
        'pagination.offset': pagination.offset,
        'pagination.limit': pagination.limit,
        'pagination.count_total': pagination.count_total,
      },
    })
  ).data;
};
