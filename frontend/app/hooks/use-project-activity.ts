import { fetchData } from "@/lib/fetch-util";
import { useQuery } from "@tanstack/react-query";

export interface ProjectActivityEntry {
  _id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: { description?: string };
  user: { _id: string; name: string; profilePicture?: string } | null;
  createdAt: string;
}

export interface ProjectActivityResponse {
  activity: ProjectActivityEntry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const useProjectActivityQuery = (projectId: string | undefined, page: number, enabled: boolean) => {
  return useQuery({
    queryKey: ["project-activity", projectId, page],
    queryFn: () => fetchData<ProjectActivityResponse>(`/projects/${projectId}/activity?page=${page}&limit=20`),
    enabled: enabled && !!projectId,
  });
};
