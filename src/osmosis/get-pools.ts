import { getOsmosisQuery } from '@many-things/cosmos-query';
import { Pool } from '@many-things/cosmos-query/dist/apis/osmosis/gamm/types';

import { OSMOSIS_CHAIN_REST } from './chain';

export const getOsmosisPools = async (): Promise<Pool[]> => {
  const { getPools, getNumPools } = getOsmosisQuery(OSMOSIS_CHAIN_REST);
  const { num_pools } = (await getNumPools()) as unknown as {
    num_pools: string;
  };

  const numberOfPools = parseInt(num_pools);
  const totalPages = Math.ceil(numberOfPools / 100);

  const promises: Promise<Pool[]>[] = new Array(totalPages)
    .fill(0)
    .map((_, offset) => {
      const promise = getPools({
        pagination: {
          offset,
          limit: 100,
        },
      })
        .then((res) => res.pools)
        .catch(() => []);
      return promise;
    });

  return (await Promise.all(promises)).flat();
};
