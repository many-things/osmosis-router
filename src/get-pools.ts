import { AxiosInstance } from 'axios';

import { Pool, getNumPools, getPools } from './osmosis';

export const DEFAULT_PAGINATION_LIMIT = 1000;

export const getOsmosisPools = async ({
  paginationLimit = DEFAULT_PAGINATION_LIMIT,
  instance,
}: {
  paginationLimit?: number;
  instance: AxiosInstance;
}): Promise<Pool[]> => {
  let totalPages: number = 1;
  if (paginationLimit !== DEFAULT_PAGINATION_LIMIT) {
    const { num_pools } = await getNumPools(instance);
    const numberOfPools = parseInt(num_pools);
    totalPages = Math.ceil(numberOfPools / paginationLimit);
  }

  const promises: Promise<Pool[]>[] = new Array(totalPages)
    .fill(0)
    .map((_, page) => {
      const promise = getPools({
        instance,
        pagination: {
          offset: page * paginationLimit,
          limit: paginationLimit,
        },
      })
        .then((res) => res.pools)
        .catch((e) => {
          console.error(e);
          return [];
        });
      return promise;
    });

  return (await Promise.all(promises)).flat();
};
