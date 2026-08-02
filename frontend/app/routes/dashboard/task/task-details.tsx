import { BackButton } from "@/components/back-button";
import { CommentSection } from "@/components/task/comment-section";
import { SubTasksDetails } from "@/components/task/sub-tasks";
import { TaskActivity } from "@/components/task/task-activity";
import { TaskAssigneesSelector } from "@/components/task/task-assignees-selector";
import { TaskDescription } from "@/components/task/task-description";
import { TaskPrioritySelector } from "@/components/task/task-priority-selector";
import { TaskStatusSelector } from "@/components/task/task-status-selector";
import { TaskTitle } from "@/components/task/task-title";
import { TaskDueDateSelector } from "@/components/task/task-due-date-selector";
import { Watchers } from "@/components/task/watcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useArchivedTaskMutation, useTaskByIdQuery, useWatchTaskMutation } from "@/hooks/use-task";
import { useProjectRealtime } from "@/hooks/use-realtime-project";
import { useAuth } from "@/provider/auth-context";
import type { Project, Task } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { Eye, EyeOff, Archive, ArchiveRestore, Trash2, CalendarIcon, Users, Tag, ListTodo } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const TaskDetailsSkeleton = () => (
    <div className="container mx-auto p-4 md:p-6 lg:max-w-6xl">
        <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-8 w-24" />
            <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
                <div className="space-y-4">
                    <Skeleton className="h-10 w-3/4" />
                    <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-32 w-full mt-6" />
                <Skeleton className="h-40 w-full mt-6" />
            </div>
            <div className="lg:col-span-4 space-y-6">
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        </div>
    </div>
);

const TaskDetails = () => {
    const { user } = useAuth();
    const { taskId, projectId, workspaceId } = useParams<{
        taskId: string;
        projectId: string;
        workspaceId: string;
    }>();
    const navigate = useNavigate();
    useProjectRealtime(projectId);

    const { data, isLoading } = useTaskByIdQuery(taskId!) as {
        data: {
            task: Task;
            project: Project;
        };
        isLoading: boolean;
    };
    
    const { mutate: watchTask, isPending: isWatching } = useWatchTaskMutation();
    const { mutate: archivedTask, isPending: isArchived } = useArchivedTaskMutation();

    if (isLoading) {
        return <TaskDetailsSkeleton />;
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh]">
                <div className="text-4xl text-slate-300 mb-4"><ListTodo size={64}/></div>
                <h2 className="text-2xl font-bold text-slate-700">Task not found</h2>
                <p className="text-slate-500 mt-2">The task you're looking for doesn't exist or you don't have access.</p>
                <Button className="mt-6" variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
            </div>
        );
    }

    const { task, project } = data;
    const isUserWatching = task?.watchers?.some(
        (watcher) => watcher._id.toString() === user?._id.toString()
    );

    const handleWatchTask = () => {
        watchTask(
            { taskId: task._id },
            {
                onSuccess: () => {
                    toast.success(isUserWatching ? "Task unwatched" : "Task watched");
                },
                onError: () => {
                    toast.error("Failed to update watch status");
                },
            }
        );
    };

    const handleArchivedTask = () => {
        archivedTask(
            { taskId: task._id },
            {
                onSuccess: () => {
                    toast.success(task.isArchived ? "Task unarchived" : "Task archived");
                },
                onError: () => {
                    toast.error("Failed to archive task");
                },
            }
        );
    };

    const handleDeleteTask = () => {
        toast.info("Delete task functionality requires backend implementation");
    }

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 lg:max-w-7xl">
            {/* Top Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 border-b border-slate-200 pb-4 sticky top-0 bg-white/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-3">
                    <BackButton />
                    <div className="h-4 w-px bg-slate-300" />
                    <span className="text-sm font-medium text-slate-500 flex items-center gap-2 uppercase tracking-wider">
                        {project.title} <span className="text-slate-300">/</span> {task._id.slice(-6).toUpperCase()}
                    </span>
                    {task.isArchived && (
                        <Badge variant="outline" className="ml-2 bg-slate-100 text-slate-600 border-slate-200">
                            Archived
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                        variant={isUserWatching ? "secondary" : "outline"}
                        size="sm"
                        onClick={handleWatchTask}
                        className={cn("flex-1 sm:flex-none transition-colors", isUserWatching && "bg-blue-50 text-blue-600 hover:bg-blue-100 border-transparent")}
                        disabled={isWatching}
                    >
                        {isUserWatching ? <EyeOff className="mr-2 size-4" /> : <Eye className="mr-2 size-4" />}
                        {isUserWatching ? "Unwatch" : "Watch"}
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleArchivedTask}
                        className="flex-1 sm:flex-none transition-colors hover:bg-slate-100"
                        disabled={isArchived}
                    >
                        {task.isArchived ? <ArchiveRestore className="mr-2 size-4" /> : <Archive className="mr-2 size-4" />}
                        {task.isArchived ? "Unarchive" : "Archive"}
                    </Button>

                    <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1" />

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 flex-none"
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the task and remove all its data from our servers.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteTask} className="bg-red-600 hover:bg-red-700 text-white">
                                    Delete Task
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* 2-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative">
                
                {/* Main Details Left Column */}
                <div className="lg:col-span-8 flex flex-col gap-8 min-w-0">
                    <div>
                        <TaskTitle title={task.title} taskId={task._id} />
                        <div className="text-[13px] font-medium text-slate-400 mt-2 flex items-center gap-1.5 ml-0.5">
                            Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                        </div>
                    </div>

                    <div className="mt-4">
                        <TaskDescription description={task.description || ""} taskId={task._id} />
                    </div>

                    <div className="mt-2">
                        <SubTasksDetails subTasks={task.subtasks || []} taskId={task._id} />
                    </div>

                    <div className="border-t border-slate-100 pt-8 mt-4">
                        <CommentSection taskId={task._id} members={project.members as any} />
                    </div>
                </div>

                {/* Right Sidebar Metadata */}
                <div className="lg:col-span-4 flex flex-col gap-6 w-full lg:sticky lg:top-28 self-start">
                    
                    {/* Properties Card */}
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col gap-5">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Properties</h3>
                        
                        <div className="grid grid-cols-[100px_1fr] items-center gap-y-4">
                            <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                <ListTodo className="size-4 opacity-70" />
                                Status
                            </div>
                            <div>
                                <TaskStatusSelector status={task.status} taskId={task._id} />
                            </div>

                            <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                <Tag className="size-4 opacity-70" />
                                Priority
                            </div>
                            <div>
                                <TaskPrioritySelector priority={task.priority} taskId={task._id} />
                            </div>

                            <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                <Users className="size-4 opacity-70" />
                                Assignees
                            </div>
                            <div>
                                <TaskAssigneesSelector
                                    task={task}
                                    assignees={task.assignees}
                                    projectMembers={project.members as any}
                                />
                            </div>

                            <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                <CalendarIcon className="size-4 opacity-70" />
                                Due Date
                            </div>
                            <div>
                                <TaskDueDateSelector dueDate={task.dueDate as any} taskId={task._id} />
                            </div>
                        </div>

                        <div className="border-t border-slate-100 mt-2 pt-5">
                             <div className="grid grid-cols-[100px_1fr] items-start">
                                <div className="text-sm font-medium text-slate-500 flex items-center gap-2 pt-1">
                                    <Eye className="size-4 opacity-70" />
                                    Watchers
                                </div>
                                <div>
                                    <Watchers watchers={task.watchers || []} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Activity Section */}
                    <TaskActivity resourceId={task._id} />
                </div>
            </div>
        </div>
    );
};

export default TaskDetails;