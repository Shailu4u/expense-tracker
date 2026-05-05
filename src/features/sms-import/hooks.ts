import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as SmsRepo from './repository';

export function usePendingSms() {
  return useQuery({
    queryKey: ['sms', 'pending'],
    queryFn: () => SmsRepo.listPending(),
  });
}

export function useImportSms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (days: number) => SmsRepo.importSinceDays(days),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sms'] }),
  });
}

export function useAcceptSms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, categoryId }: { id: string; categoryId: string }) =>
      SmsRepo.accept(id, categoryId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sms'] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useRejectSms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SmsRepo.reject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sms'] }),
  });
}
