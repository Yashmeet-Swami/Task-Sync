import { BackButton } from "@/components/back-button";
import { Loader } from "@/components/ui/loader";
import { CreateTaskDialog } from "@/components/task/create-task-dialog";
import { ProjectActivityLogDialog } from "@/components/project/project-activity-log-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjectPermissions } from "@/hooks/use-permissions";
import { UseProjectQuery } from "@/hooks/use-project";
import { useProjectRealtime } from "@/hooks/use-realtime-project";
import { useDebounce } from "@/hooks/use-debounce";
import { getProjectProgress } from "@/lib";
import { cn } from "@/lib/utils";
import type { Project, Task, TaskStatus } from "@/types";
import { format } from "date-fns";
import { AlertCircle, Calendar as CalendarIcon, CheckCircle, Clock, Plus, LayoutList, LayoutDashboard, Search, X, ChevronLeft, ChevronRight, History } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router";

const ProjectDetails = () => {
  const { projectId, workspaceId } = useParams<{
    projectId: string;
    workspaceId: string;
  }>();
  const navigate = useNavigate();
  useProjectRealtime(projectId);

  const [isCreateTask, setIsCreateTask] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);

  // Dual-view mode
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  
  // Filters State
  const [filters, setFilters] = useState({
    search: "",
    status: "All",
    priority: "All",
    assignee: "All",
    dueDate: "All",
    dueDateStart: "",
    dueDateEnd: "",
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const debouncedSearch = useDebounce(filters.search, 500);

  // Prepare API params
  const apiParams = useMemo(() => {
    const params: any = {};
    if (viewMode === "list") {
        params.page = filters.page;
        params.limit = filters.limit;
    } else {
        // Kanban view loads all tasks (no pagination), but we might still want to apply search/filters
        // Alternatively, maybe kanban fetches everything but we can still paginate backend if needed.
        // The user said: "Confirm that Kanban view behaves correctly with limited sorting and no pagination issues".
        // Let's request all for kanban by setting high limit, or let backend return all. We'll set a high limit.
        params.page = 1;
        params.limit = 100; // max limit
    }
    
    params.sortBy = filters.sortBy;
    params.sortOrder = filters.sortOrder;

    if (debouncedSearch) params.search = debouncedSearch;
    if (filters.status !== "All") params.status = filters.status;
    if (filters.priority !== "All") params.priority = filters.priority;
    if (filters.assignee !== "All") params.assignee = filters.assignee;
    if (filters.dueDate !== "All") params.dueDate = filters.dueDate;
    if (filters.dueDate === "custom") {
      if (filters.dueDateStart) params.dueDateStart = filters.dueDateStart;
      if (filters.dueDateEnd) params.dueDateEnd = filters.dueDateEnd;
    }
    return params;
  }, [filters, debouncedSearch, viewMode]);

  const { data, isLoading } = UseProjectQuery(projectId!, apiParams) as {
    data: {
      tasks: Task[];
      project: Project;
      pagination: { total: number; page: number; limit: number; totalPages: number };
    };
    isLoading: boolean;
  };

  const { canCreateTask } = useProjectPermissions(data?.project);

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "All",
      priority: "All",
      assignee: "All",
      dueDate: "All",
      dueDateStart: "",
      dueDateEnd: "",
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  if (isLoading && !data)
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader />
      </div>
    );

  const { project, tasks, pagination } = data || {};
  
  // Safe default for tasks
  const safeTasks = tasks || [];
  const projectProgress = getProjectProgress(safeTasks);
  const todoTasks = safeTasks.filter((task) => task.status === "To Do");
  const inProgressTasks = safeTasks.filter((task) => task.status === "In Progress");
  const doneTasks = safeTasks.filter((task) => task.status === "Done");

  const handleTaskClick = (taskId: string) => {
    navigate(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <BackButton />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-slate-950">
                  {project?.title}
                </h1>
                <Badge className="border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50">
                  {project?.status}
                </Badge>
              </div>
              {project?.description && (
                <p className="mt-1 max-w-3xl text-sm text-slate-500">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:items-center">
            <div className="min-w-64 rounded-lg border bg-slate-50 px-4 py-3">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Progress</span>
                <span className="font-semibold text-slate-950">
                  {projectProgress}%
                </span>
              </div>
              <Progress value={projectProgress} className="h-2" />
            </div>

            <Button
              variant="outline"
              className="h-11 px-5 font-medium"
              onClick={() => setIsActivityLogOpen(true)}
            >
              <History className="mr-2 size-4" />
              Activity Log
            </Button>

            {canCreateTask && (
              <Button
                className="h-11 bg-blue-600 px-5 font-medium hover:bg-blue-700"
                onClick={() => setIsCreateTask(true)}
              >
                <Plus className="mr-2 size-4" />
                Add Task
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Task Filters</h2>
          <div className="flex items-center gap-2 border rounded-md p-1 bg-slate-50">
            <button
                className={cn("px-3 py-1.5 text-sm font-medium rounded-sm flex items-center gap-2", viewMode === "kanban" ? "bg-white shadow-sm text-blue-600" : "text-slate-500")}
                onClick={() => setViewMode("kanban")}
            >
                <LayoutDashboard className="size-4" /> Kanban
            </button>
            <button
                className={cn("px-3 py-1.5 text-sm font-medium rounded-sm flex items-center gap-2", viewMode === "list" ? "bg-white shadow-sm text-blue-600" : "text-slate-500")}
                onClick={() => setViewMode("list")}
            >
                <LayoutList className="size-4" /> List
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input 
                    placeholder="Search tasks..." 
                    className="pl-9"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                />
            </div>
            
            <Select value={filters.status} onValueChange={(val) => setFilters(prev => ({ ...prev, status: val, page: 1 }))}>
                <SelectTrigger>
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="To Do">To Do</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Review">Review</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
            </Select>

            <Select value={filters.priority} onValueChange={(val) => setFilters(prev => ({ ...prev, priority: val, page: 1 }))}>
                <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Priorities</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
            </Select>

            <Select value={filters.dueDate} onValueChange={(val) => setFilters(prev => ({ ...prev, dueDate: val, page: 1 }))}>
                <SelectTrigger>
                    <SelectValue placeholder="Due Date" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">Any Time</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="today">Due Today</SelectItem>
                    <SelectItem value="this_week">Due This Week</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
            </Select>

            {filters.dueDate === "custom" && (
                <div className="col-span-1 md:col-span-2 lg:col-span-4 flex items-center gap-4 bg-slate-50 p-3 rounded-md border border-slate-100">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600">Start Date:</span>
                        <Input type="date" className="w-40" value={filters.dueDateStart} onChange={(e) => setFilters(prev => ({ ...prev, dueDateStart: e.target.value, page: 1 }))} />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600">End Date:</span>
                        <Input type="date" className="w-40" value={filters.dueDateEnd} onChange={(e) => setFilters(prev => ({ ...prev, dueDateEnd: e.target.value, page: 1 }))} />
                    </div>
                </div>
            )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Sort by:</span>
                <Select value={filters.sortBy} onValueChange={(val) => setFilters(prev => ({ ...prev, sortBy: val }))}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="createdAt">Created Date</SelectItem>
                        <SelectItem value="dueDate">Due Date</SelectItem>
                        <SelectItem value="priority">Priority</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filters.sortOrder} onValueChange={(val) => setFilters(prev => ({ ...prev, sortOrder: val }))}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue placeholder="Order" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="desc">Descending</SelectItem>
                        <SelectItem value="asc">Ascending</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-slate-500 hover:text-slate-900">
                <X className="mr-2 size-3.5" />
                Reset Filters
            </Button>
        </div>
      </div>

      {isLoading && (
         <div className="flex justify-center p-8"><Loader /></div>
      )}

      {!isLoading && viewMode === "kanban" && (
        <Tabs defaultValue="all" className="w-full">
            <div className="flex flex-col gap-4 rounded-lg border bg-slate-50/80 p-3 md:flex-row md:items-center md:justify-between">
            <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-md bg-white p-1 md:w-auto">
                <TabsTrigger value="all" className="gap-2">
                All Tasks <Badge variant="outline" className="bg-white">{safeTasks.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="todo" className="gap-2">
                To Do <Badge variant="outline" className="bg-white">{todoTasks.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="in-progress" className="gap-2">
                In Progress <Badge variant="outline" className="bg-white">{inProgressTasks.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="done" className="gap-2">
                Done <Badge variant="outline" className="bg-white">{doneTasks.length}</Badge>
                </TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap gap-2 text-sm">
                <StatusPill label="To Do" count={todoTasks.length} tone="slate" />
                <StatusPill label="In Progress" count={inProgressTasks.length} tone="amber" />
                <StatusPill label="Done" count={doneTasks.length} tone="emerald" />
            </div>
            </div>

            <TabsContent value="all" className="mt-5">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <TaskColumn title="To Do" tasks={todoTasks} onTaskClick={handleTaskClick} tone="slate" />
                <TaskColumn title="In Progress" tasks={inProgressTasks} onTaskClick={handleTaskClick} tone="amber" />
                <TaskColumn title="Done" tasks={doneTasks} onTaskClick={handleTaskClick} tone="emerald" />
            </div>
            </TabsContent>

            <TabsContent value="todo" className="mt-5">
            <TaskColumn title="To Do" tasks={todoTasks} onTaskClick={handleTaskClick} tone="slate" isFullWidth />
            </TabsContent>

            <TabsContent value="in-progress" className="mt-5">
            <TaskColumn title="In Progress" tasks={inProgressTasks} onTaskClick={handleTaskClick} tone="amber" isFullWidth />
            </TabsContent>

            <TabsContent value="done" className="mt-5">
            <TaskColumn title="Done" tasks={doneTasks} onTaskClick={handleTaskClick} tone="emerald" isFullWidth />
            </TabsContent>
        </Tabs>
      )}

      {!isLoading && viewMode === "list" && (
         <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
             {safeTasks.length === 0 ? (
                 <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                     <Search className="size-10 text-slate-300 mb-4" />
                     <p>No tasks found matching your filters.</p>
                 </div>
             ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 font-medium">Title</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Priority</th>
                                <th className="px-4 py-3 font-medium">Assignees</th>
                                <th className="px-4 py-3 font-medium">Due Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {safeTasks.map(task => (
                                <tr key={task._id} onClick={() => handleTaskClick(task._id)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-900">{task.title}</td>
                                    <td className="px-4 py-3">
                                        <Badge variant="outline" className="bg-white">{task.status}</Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant="outline" className={cn("rounded-full px-2 py-0.5 text-xs font-medium", priorityStyles[task.priority as keyof typeof priorityStyles])}>
                                            {task.priority}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        {task.assignees && task.assignees.length > 0 ? (
                                            <div className="flex -space-x-2">
                                                {task.assignees.slice(0, 3).map((member: any) => (
                                                <Avatar key={member._id} className="relative size-6 rounded-full border-2 border-white bg-slate-100" title={member.name}>
                                                    <AvatarImage src={member.profilePicture} />
                                                    <AvatarFallback className="text-[10px]">{member.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                ))}
                                                {task.assignees.length > 3 && (
                                                <span className="flex size-6 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] text-slate-500">
                                                    +{task.assignees.length - 3}
                                                </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                        {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             )}

             {pagination && pagination.totalPages > 0 && (
                <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between bg-slate-50">
                    <p className="text-sm text-slate-500">
                        Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> tasks
                    </p>
                    <div className="flex items-center gap-1">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-2"
                            disabled={pagination.page <= 1}
                            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                        >
                            <ChevronLeft className="size-4" />
                        </Button>
                        
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(pageNum => (
                            <Button 
                                key={pageNum}
                                variant={pagination.page === pageNum ? "default" : "outline"}
                                size="sm"
                                className={cn("h-8 w-8", pagination.page === pageNum ? "bg-blue-600 text-white" : "")}
                                onClick={() => setFilters(prev => ({ ...prev, page: pageNum }))}
                            >
                                {pageNum}
                            </Button>
                        ))}
                        
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-2"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                        >
                            <ChevronRight className="size-4" />
                        </Button>

                        <Select value={String(filters.limit)} onValueChange={(val) => setFilters(prev => ({ ...prev, limit: Number(val), page: 1 }))}>
                            <SelectTrigger className="ml-4 h-8 w-[100px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10 / page</SelectItem>
                                <SelectItem value="20">20 / page</SelectItem>
                                <SelectItem value="50">50 / page</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
             )}
         </div>
      )}

      {canCreateTask && (
        <CreateTaskDialog
          open={isCreateTask}
          onOpenChange={setIsCreateTask}
          projectId={projectId!}
          projectMembers={project?.members as any}
        />
      )}

      <ProjectActivityLogDialog
        open={isActivityLogOpen}
        onOpenChange={setIsActivityLogOpen}
        projectId={projectId}
      />
    </div>
  );
};

export default ProjectDetails;

type ColumnTone = "slate" | "amber" | "emerald";

const columnToneStyles = {
  slate: {
    container: "border-slate-200 bg-slate-50",
    accent: "bg-slate-500",
    badge: "border-slate-200 bg-white text-slate-700",
  },
  amber: {
    container: "border-amber-200 bg-amber-50/50",
    accent: "bg-amber-500",
    badge: "border-amber-200 bg-white text-amber-700",
  },
  emerald: {
    container: "border-emerald-200 bg-emerald-50/50",
    accent: "bg-emerald-500",
    badge: "border-emerald-200 bg-white text-emerald-700",
  },
};

const priorityStyles = {
  High: "border-red-200 bg-red-50 text-red-700",
  Medium: "border-orange-200 bg-orange-50 text-orange-700",
  Low: "border-slate-200 bg-slate-50 text-slate-600",
};

const StatusPill = ({ label, count, tone }: { label: string; count: number; tone: ColumnTone }) => {
  const styles = columnToneStyles[tone];
  return (
    <div className={cn("flex items-center gap-2 rounded-full border px-3 py-1 font-medium", styles.badge)}>
      <span>{count}</span>
      <span>{label}</span>
    </div>
  );
};

interface TaskColumnProps {
  title: string;
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  isFullWidth?: boolean;
  tone: ColumnTone;
}

const TaskColumn = ({ title, tasks, onTaskClick, isFullWidth = false, tone }: TaskColumnProps) => {
  const styles = columnToneStyles[tone];
  return (
    <section className={cn("min-h-80 rounded-lg border p-4", styles.container, isFullWidth && "min-h-0")}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", styles.accent)} />
          <h2 className="font-semibold text-slate-950">{title}</h2>
        </div>
        <Badge variant="outline" className={styles.badge}>{tasks.length}</Badge>
      </div>
      <div className={cn("space-y-3", isFullWidth && "grid gap-4 space-y-0 md:grid-cols-2 xl:grid-cols-3")}>
        {tasks.length === 0 ? (
          <div className="flex min-h-36 items-center justify-center rounded-md border border-dashed border-slate-300 bg-white/70 px-4 text-sm text-slate-500">
            No tasks yet
          </div>
        ) : (
          tasks.map((task) => <TaskCard key={task._id} task={task} onClick={() => onTaskClick(task._id)} />)
        )}
      </div>
    </section>
  );
};

const TaskCard = ({ task, onClick }: { task: Task; onClick: () => void }) => {
  const handleActionClick = (event: React.MouseEvent<HTMLButtonElement>, message: string) => {
    event.stopPropagation();
    console.log(message);
  };
  return (
    <Card onClick={onClick} className="cursor-pointer border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <CardHeader className="space-y-0 p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 text-xs font-medium", priorityStyles[task.priority as keyof typeof priorityStyles])}>
            {task.priority}
          </Badge>
          <div className="flex shrink-0 gap-1 rounded-full bg-slate-50 p-1">
            {task.status !== "To Do" && (
              <Button variant="ghost" size="icon" className="size-7 rounded-full hover:bg-white" onClick={(e) => handleActionClick(e, "mark as to do")} title="Mark as To Do">
                <AlertCircle className="size-4 text-slate-500" />
              </Button>
            )}
            {task.status !== "In Progress" && (
              <Button variant="ghost" size="icon" className="size-7 rounded-full hover:bg-white" onClick={(e) => handleActionClick(e, "mark as in progress")} title="Mark as In Progress">
                <Clock className="size-4 text-amber-600" />
              </Button>
            )}
            {task.status !== "Done" && (
              <Button variant="ghost" size="icon" className="size-7 rounded-full hover:bg-white" onClick={(e) => handleActionClick(e, "mark as done")} title="Mark as Done">
                <CheckCircle className="size-4 text-emerald-600" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <h3 className="mb-1 line-clamp-1 font-semibold text-slate-950">{task.title}</h3>
        {task.description && <p className="mb-4 line-clamp-2 text-sm leading-6 text-slate-500">{task.description}</p>}
        <div className="flex items-end justify-between gap-3 border-t border-slate-100 pt-3 text-sm">
          <div className="min-h-8">
            {task.assignees && task.assignees.length > 0 ? (
              <div className="flex -space-x-2">
                {task.assignees.slice(0, 5).map((member: any) => (
                  <Avatar key={member._id} className="relative size-8 rounded-full border-2 border-white bg-slate-100" title={member.name}>
                    <AvatarImage src={member.profilePicture} />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
                {task.assignees.length > 5 && (
                  <span className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs text-slate-500">+{task.assignees.length - 5}</span>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-400">Unassigned</span>
            )}
          </div>
          {task.dueDate && (
            <div className="flex items-center whitespace-nowrap text-xs font-medium text-slate-500">
              <CalendarIcon className="mr-1.5 size-3.5" />
              {format(new Date(task.dueDate), "MMM d, yyyy")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
