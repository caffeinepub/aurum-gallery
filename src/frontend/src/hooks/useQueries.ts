import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Moment } from "../backend.d";
import { useActor } from "./useActor";

export function useAllMoments() {
  const { actor, isFetching } = useActor();
  return useQuery<Moment[]>({
    queryKey: ["moments"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMoments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useMoment(id: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Moment | null>({
    queryKey: ["moment", id?.toString()],
    queryFn: async () => {
      if (!actor || id === null) return null;
      return actor.getMoment(id);
    },
    enabled: !!actor && !isFetching && id !== null,
  });
}

export function useCreateMoment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      caption: string;
      date: string;
      imageId: string;
      uploadedBy: string;
      videoId?: string | null;
      audioId?: string | null;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.createMoment(
        data.title,
        data.caption,
        data.date,
        data.imageId,
        data.uploadedBy,
        data.videoId ?? null,
        data.audioId ?? null,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moments"] });
    },
  });
}

export function useDeleteMoment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteMoment(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moments"] });
    },
  });
}
