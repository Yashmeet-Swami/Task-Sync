import { fetchData } from "@/lib/fetch-util";
import { useQuery } from "@tanstack/react-query";

export interface SearchProjectResult {
  _id: string;
  title: string;
  description?: string;
  status: string;
  workspace: string;
}

export interface SearchTaskResult {
  _id: string;
  title: string;
  status: string;
  priority: string;
  project: { _id: string; title: string; workspace: string };
}

export interface SearchResults {
  projects: SearchProjectResult[];
  tasks: SearchTaskResult[];
}

export const useGlobalSearchQuery = (query: string) => {
  return useQuery({
    queryKey: ["global-search", query],
    queryFn: () => fetchData<SearchResults>(`/search?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length > 1,
  });
};
