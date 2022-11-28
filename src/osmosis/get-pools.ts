import { getOsmosisQuery } from '@many-things/cosmos-query';
import { Pool } from '@many-things/cosmos-query/dist/apis/osmosis/gamm/types';

import { OSMOSIS_CHAIN_CONFIG } from './chain';

export const getOsmosisPools = async (): Promise<Pool[]> => {
  const { getPools, getNumPools } = getOsmosisQuery(OSMOSIS_CHAIN_CONFIG.rest);
  const { num_pools } = (await getNumPools()) as unknown as {
    num_pools: string;
  };
  const numberOfPools = parseInt(num_pools);

  const promises: Promise<Pool[]>[] = [];
  for (let i = 0; i < numberOfPools; i += 100) {
    promises.push(
      getPools({
        pagination: {
          offset: i,
          limit: 100,
        },
      }).then((res) => res.pools),
    );
  }
  return (await Promise.all(promises)).flat();
};
