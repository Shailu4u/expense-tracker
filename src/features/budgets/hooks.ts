import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as BudgetRepo from './repository';
import type { BudgetInput } from '@/storage/schemas';

export function useBudgetsForMonth(monthStartIso: string) {
  return useQuery({
    queryKey: ['budgets', 'month', monthStartIso],
    queryFn: () => BudgetRepo.listForMonth(monthStartIso),
  });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BudgetInput) => BudgetRepo.upsert(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => BudgetRepo.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}
