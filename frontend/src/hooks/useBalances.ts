import { useQuery } from '@tanstack/react-query';
import { groupsApi } from '../api/groups';

export const useBalances = (groupId: string) => {
  const balancesQuery = useQuery({
    queryKey: ['group', groupId, 'balances'],
    queryFn: () => groupsApi.getBalances(groupId),
    enabled: !!groupId,
  });

  return { balancesQuery };
};
