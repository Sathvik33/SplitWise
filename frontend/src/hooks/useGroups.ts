import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '../api/groups';

export const useGroups = () => {
  const queryClient = useQueryClient();

  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: groupsApi.listGroups,
  });

  const createGroupMutation = useMutation({
    mutationFn: groupsApi.createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  return { groupsQuery, createGroupMutation };
};

export const useGroup = (id: string) => {
  const queryClient = useQueryClient();

  const groupQuery = useQuery({
    queryKey: ['group', id],
    queryFn: () => groupsApi.getGroup(id),
    enabled: !!id,
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ email }: { email: string }) => groupsApi.addMember(id, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', id] });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: (name: string) => groupsApi.updateGroup(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: (file: File) => groupsApi.uploadPhoto(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: () => groupsApi.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  return { groupQuery, addMemberMutation, updateGroupMutation, uploadPhotoMutation, deleteGroupMutation };
};
