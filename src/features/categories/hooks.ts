import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as CategoryRepo from './repository';
import type { CategoryInput } from '@/storage/schemas';

export const catKeys = {
  all: ['categories'] as const,
  forKind: (k: 'expense' | 'income') => ['categories', 'kind', k] as const,
  byId: (id: string) => ['categories', 'byId', id] as const,
};

export function useCategories(opts?: { includeHidden?: boolean }) {
  return useQuery({
    queryKey: opts?.includeHidden ? ['categories', 'all-with-hidden'] : catKeys.all,
    queryFn: () => CategoryRepo.listAll(opts),
  });
}

export function useCategoriesForKind(kind: 'expense' | 'income') {
  return useQuery({
    queryKey: catKeys.forKind(kind),
    queryFn: () => CategoryRepo.listForKind(kind),
  });
}

export function useCategory(id: string | undefined) {
  return useQuery({
    queryKey: id ? catKeys.byId(id) : ['categories', 'byId', '__none__'],
    queryFn: () => (id ? CategoryRepo.findById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) => CategoryRepo.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CategoryInput> }) =>
      CategoryRepo.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useHideCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CategoryRepo.hide(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUnhideCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CategoryRepo.unhide(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useMergeCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fromId, intoId }: { fromId: string; intoId: string }) =>
      CategoryRepo.merge(fromId, intoId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
