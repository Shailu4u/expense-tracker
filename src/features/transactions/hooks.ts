import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as TransactionRepo from './repository';
import type { TransactionInput, TransactionUpdate } from '@/storage/schemas';

export const txnKeys = {
  all: ['transactions'] as const,
  range: (start: string, end: string, extra?: object) =>
    ['transactions', 'range', start, end, extra ?? {}] as const,
  byId: (id: string) => ['transactions', 'byId', id] as const,
  sumByMonth: (start: string, end: string, kind: 'expense' | 'income') =>
    ['transactions', 'sum', start, end, kind] as const,
  sumByCategory: (start: string, end: string) =>
    ['transactions', 'sumByCategory', start, end] as const,
  recentMerchants: () => ['transactions', 'recentMerchants'] as const,
};

export function useTransactionsInRange(args: {
  start: string;
  end: string;
  search?: string;
  categoryId?: string;
  paymentMode?: TransactionRepo.TransactionRow['paymentMode'];
  kind?: 'expense' | 'income';
}) {
  return useQuery({
    queryKey: txnKeys.range(args.start, args.end, {
      search: args.search,
      categoryId: args.categoryId,
      paymentMode: args.paymentMode,
      kind: args.kind,
    }),
    queryFn: () => TransactionRepo.listInRange(args),
  });
}

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: id ? txnKeys.byId(id) : ['transactions', 'byId', '__none__'],
    queryFn: () => (id ? TransactionRepo.findById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useMonthSum(start: string, end: string, kind: 'expense' | 'income' = 'expense') {
  return useQuery({
    queryKey: txnKeys.sumByMonth(start, end, kind),
    queryFn: () => TransactionRepo.sumByMonth(start, end, kind),
  });
}

export function useCategorySums(start: string, end: string) {
  return useQuery({
    queryKey: txnKeys.sumByCategory(start, end),
    queryFn: () => TransactionRepo.sumByCategory(start, end),
  });
}

export function useRecentMerchants() {
  return useQuery({
    queryKey: txnKeys.recentMerchants(),
    queryFn: () => TransactionRepo.recentMerchants(),
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransactionInput) => TransactionRepo.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: txnKeys.all });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TransactionUpdate }) =>
      TransactionRepo.update(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: txnKeys.all });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => TransactionRepo.softDelete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: txnKeys.all });
    },
  });
}

export function useRestoreTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => TransactionRepo.restore(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: txnKeys.all });
    },
  });
}
