import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchSession,
  loginAdmin,
  refreshSession,
  signOut,
  updateUser,
} from '../../apis/authApi.js';

export const authQueryKey = ['admin', 'session'];

export function useSession() {
  return useQuery({
    queryKey: authQueryKey,
    queryFn: fetchSession,
    retry: false,
    staleTime: 30 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['admin', 'auth'],
    mutationFn: loginAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKey });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['admin', 'auth'],
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useRefreshSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['admin', 'auth'],
    mutationFn: refreshSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKey });
    },
  });
}

export function useUpdateUser() {
  return useMutation({
    mutationKey: ['admin', 'auth'],
    mutationFn: updateUser,
  });
}
