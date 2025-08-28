// hooks/useOptimisticMutation.ts
import {
  MutationFunction,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

interface UseOptimisticMutationOptions<TVariables, TItem = any> {
  mutationFn: MutationFunction<void, TVariables>;
  queryKey: string[];
  getOptimisticUpdate: (item: TItem, variables: TVariables) => TItem;
  getItemId: (item: TItem) => string;
  successMessage?: string;
  errorMessage?: string;
}

export function useOptimisticMutation<TVariables, TItem = any>({
  mutationFn,
  queryKey,
  getOptimisticUpdate,
  getItemId,
  successMessage = 'Update successful',
  errorMessage = 'Update failed',
}: UseOptimisticMutationOptions<TVariables, TItem>) {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn,

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<TItem[]>(queryKey);

      queryClient.setQueryData<TItem[]>(queryKey, (old = []) =>
        old.map((item) =>
          getItemId(item) === getItemId(variables as unknown as TItem)
            ? getOptimisticUpdate(item, variables)
            : item,
        ),
      );

      return { previous };
    },

    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      enqueueSnackbar(errorMessage, { variant: 'error' });
    },

    onSuccess: () => {
      enqueueSnackbar(successMessage, { variant: 'success' });
    },

    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });
}
