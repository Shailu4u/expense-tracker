import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as RecurringRepo from './repository';

export function useRecurring() {
  return useQuery({
    queryKey: ['recurring', 'all'],
    queryFn: () => RecurringRepo.listAll(),
  });
}

export function useRecurringById(id: string | undefined) {
  return useQuery({
    queryKey: id ? ['recurring', 'byId', id] : ['recurring', 'byId', '__none__'],
    queryFn: () => (id ? RecurringRepo.findById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useDueRuns() {
  return useQuery({
    queryKey: ['recurring', 'dueRuns'],
    queryFn: () => RecurringRepo.listDueRuns(),
  });
}

export function useSweepDue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => RecurringRepo.sweepDue(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof RecurringRepo.create>[0]) => RecurringRepo.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  });
}

export function useUpdateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof RecurringRepo.update>[1] }) =>
      RecurringRepo.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => RecurringRepo.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  });
}

export function useMarkPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => RecurringRepo.markPaid(runId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['recurring'] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useSkipRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => RecurringRepo.skip(runId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  });
}
