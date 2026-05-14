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
  totalsInRange: (start: string, end: string) =>
    ['transactions', 'totalsInRange', start, end] as const,
  sumByPaymentMode: (start: string, end: string) =>
    ['transactions', 'sumByPaymentMode', start, end] as const,
  dailyTotals: (start: string, end: string) =>
    ['transactions', 'dailyTotals', start, end] as const,
  sumByWeekday: (start: string, end: string) =>
    ['transactions', 'sumByWeekday', start, end] as const,
  monthlyTotalsRange: (start: string, end: string) =>
    ['transactions', 'monthlyTotalsRange', start, end] as const,
  topMerchants: (start: string, end: string, limit: number) =>
    ['transactions', 'topMerchants', start, end, limit] as const,
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

export function useTotalsInRange(start: string, end: string) {
  return useQuery({
    queryKey: txnKeys.totalsInRange(start, end),
    queryFn: () => TransactionRepo.totalsInRange(start, end),
  });
}

export function useSumByPaymentMode(start: string, end: string) {
  return useQuery({
    queryKey: txnKeys.sumByPaymentMode(start, end),
    queryFn: () => TransactionRepo.sumByPaymentMode(start, end),
  });
}

export function useDailyTotals(start: string, end: string) {
  return useQuery({
    queryKey: txnKeys.dailyTotals(start, end),
    queryFn: () => TransactionRepo.dailyTotals(start, end),
  });
}

export function useSumByWeekday(start: string, end: string) {
  return useQuery({
    queryKey: txnKeys.sumByWeekday(start, end),
    queryFn: () => TransactionRepo.sumByWeekday(start, end),
  });
}

export function useMonthlyTotalsInRange(start: string, end: string) {
  return useQuery({
    queryKey: txnKeys.monthlyTotalsRange(start, end),
    queryFn: () => TransactionRepo.monthlyTotalsInRange(start, end),
  });
}

export function useTopMerchants(start: string, end: string, limit = 8) {
  return useQuery({
    queryKey: txnKeys.topMerchants(start, end, limit),
    queryFn: () => TransactionRepo.topMerchants(start, end, limit),
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
