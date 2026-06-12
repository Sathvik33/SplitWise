import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi } from '../api/expenses';

export const useGroupExpenses = (groupId: string) => {
  const queryClient = useQueryClient();

  const expensesQuery = useQuery({
    queryKey: ['group', groupId, 'expenses'],
    queryFn: () => expensesApi.listGroupExpenses(groupId),
    enabled: !!groupId,
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => expensesApi.createExpense(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId, 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId, 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return { expensesQuery, createExpenseMutation };
};

export const useExpense = (expenseId: string) => {
  const expenseQuery = useQuery({
    queryKey: ['expense', expenseId],
    queryFn: () => expensesApi.getExpense(expenseId),
    enabled: !!expenseId,
  });

  const messagesQuery = useQuery({
    queryKey: ['expense', expenseId, 'messages'],
    queryFn: () => expensesApi.listMessages(expenseId),
    enabled: !!expenseId,
  });

  return { expenseQuery, messagesQuery };
};
