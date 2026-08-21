import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSession, loginAdmin, signOut, refreshSession, updateUser } from '../apis/authApi';

export function useSession() {
  return useQuery({
    queryKey: ['admin', 'session'],
    queryFn: fetchSession,
    retry: false,
    staleTime: 30 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: loginAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'session'] });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useRefreshSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: refreshSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'session'] });
    },
  });
}

export function useUpdateUser() {
  return useMutation({
    mutationFn: updateUser,
  });
}
