import { useAuth } from "@/provider/auth-context";
import type { Workspace } from "@/types";
import { Bell, PlusCircle, Search } from "lucide-react";
import { useState } from "react";
import { Link, useLoaderData, useLocation, useNavigate } from "react-router";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../dropdown-menu";
import { Button } from "../button";
import { Input } from "../input";
import { WorkspaceAvatar } from "@/components/workspace/workspace-avatar";
import { Avatar, AvatarFallback, AvatarImage } from "../avatar";
import { useDebounce } from "@/hooks/use-debounce";
import { useGlobalSearchQuery, type SearchProjectResult, type SearchTaskResult } from "@/hooks/use-search";

interface HeaderProps {
  onWorkspaceSelected: (workspace: Workspace) => void;
  selectedWorkspace: Workspace | null;
  onCreateWorkspace: () => void;
}

export const Header = ({
  onWorkspaceSelected,
  selectedWorkspace,
  onCreateWorkspace,
}: HeaderProps) => {
  const navigate = useNavigate();

  const { user, logout } = useAuth();
  const { workspaces } = useLoaderData() as { workspaces: Workspace[] };
  const isOnWorkspacePage = useLocation().pathname.includes("/workspace");

  const [searchInput, setSearchInput] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const debouncedSearch = useDebounce(searchInput, 300);
  const { data: searchResults, isFetching: isSearching } = useGlobalSearchQuery(debouncedSearch);
  const showSearchDropdown = isSearchFocused && debouncedSearch.trim().length > 1;

  const goToTask = (task: SearchTaskResult) => {
    setSearchInput("");
    setIsSearchFocused(false);
    navigate(`/workspaces/${task.project.workspace}/projects/${task.project._id}/tasks/${task._id}`);
  };

  const goToProject = (project: SearchProjectResult) => {
    setSearchInput("");
    setIsSearchFocused(false);
    navigate(`/workspaces/${project.workspace}/projects/${project._id}`);
  };

  const handleOnClick = (workspace: Workspace) => {
    localStorage.setItem("selectedWorkspace" , JSON.stringify(workspace));

    onWorkspaceSelected(workspace);
    const location = window.location;

    if (isOnWorkspacePage) {
      navigate(`/workspaces/${workspace._id}`);
    } else {
      const basePath = location.pathname;

      navigate(`${basePath}?workspaceId=${workspace._id}`);
    }
  };

  return (
    <div className="bg-background sticky top-0 z-40 border-b">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={"outline"}>
              {selectedWorkspace ? (
                <>
                  {selectedWorkspace.color && (
                    <WorkspaceAvatar
                      color={selectedWorkspace.color}
                      name={selectedWorkspace.name}
                    />
                  )}
                  <span className="font-medium">{selectedWorkspace?.name}</span>
                </>
              ) : (
                <span className="font-medium">Select Workspace</span>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent>
            <DropdownMenuLabel>Workspace</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws._id}
                  onClick={() => handleOnClick(ws)}
                >
                  {ws.color && (
                    <WorkspaceAvatar color={ws.color} name={ws.name} />
                  )}
                  <span className="ml-2">{ws.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>

            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onCreateWorkspace}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Workspace
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative hidden md:block w-full max-w-sm mx-4">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
            placeholder="Search tasks and projects..."
            className="pl-8"
          />

          {showSearchDropdown && (
            <div className="absolute top-full mt-1 w-full rounded-md border bg-popover shadow-md z-50 max-h-80 overflow-y-auto">
              {isSearching ? (
                <div className="p-3 text-sm text-muted-foreground">Searching...</div>
              ) : searchResults && (searchResults.projects.length > 0 || searchResults.tasks.length > 0) ? (
                <>
                  {searchResults.projects.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
                        Projects
                      </div>
                      {searchResults.projects.map((project) => (
                        <button
                          key={project._id}
                          onClick={() => goToProject(project)}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-accent text-sm"
                        >
                          {project.title}
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.tasks.length > 0 && (
                    <div className="p-2 border-t">
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
                        Tasks
                      </div>
                      {searchResults.tasks.map((task) => (
                        <button
                          key={task._id}
                          onClick={() => goToTask(task)}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-accent text-sm flex items-center justify-between gap-2"
                        >
                          <span className="truncate">{task.title}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {task.project.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-3 text-sm text-muted-foreground">No results found</div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Bell />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full border p-0 w-8 h-8 overflow-hidden">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.profilePicture} alt={user?.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link to="/user/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>Log Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};