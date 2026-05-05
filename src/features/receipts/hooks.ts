import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ReceiptRepo from './repository';

export function useReceiptsForTransaction(txnId: string | undefined) {
  return useQuery({
    queryKey: txnId ? ['receipts', 'forTxn', txnId] : ['receipts', 'forTxn', '__none__'],
    queryFn: () => (txnId ? ReceiptRepo.listForTransaction(txnId) : Promise.resolve([])),
    enabled: !!txnId,
  });
}

export function useAllReceipts() {
  return useQuery({
    queryKey: ['receipts', 'all'],
    queryFn: () => ReceiptRepo.listAll(),
  });
}

export function useAttachReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, source }: { transactionId: string; source: 'pick' | 'camera' }) =>
      ReceiptRepo.attach(transactionId, source),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipts'] }),
  });
}

export function useDeleteReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ReceiptRepo.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipts'] }),
  });
}
