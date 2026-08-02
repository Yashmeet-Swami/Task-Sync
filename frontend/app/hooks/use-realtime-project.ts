import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/lib/socket";

interface TaskChangedPayload {
  taskId: string;
  projectId: string;
}

// Joins the project's room and keeps React Query in sync with what other
// members are doing, without polling - a live update from anyone else editing
// the same project shows up here without a manual refresh.
export const useProjectRealtime = (projectId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.emit("join:project", projectId);

    const invalidateProject = () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    };

    const handleTaskChanged = (payload: TaskChangedPayload) => {
      invalidateProject();
      queryClient.invalidateQueries({ queryKey: ["task", payload.taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-activity", payload.taskId] });
    };

    const handleCommentAdded = (payload: TaskChangedPayload) => {
      queryClient.invalidateQueries({ queryKey: ["comments", payload.taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-activity", payload.taskId] });
    };

    socket.on("task:created", invalidateProject);
    socket.on("task:updated", handleTaskChanged);
    socket.on("comment:added", handleCommentAdded);

    return () => {
      socket.off("task:created", invalidateProject);
      socket.off("task:updated", handleTaskChanged);
      socket.off("comment:added", handleCommentAdded);
      socket.emit("leave:project", projectId);
    };
  }, [projectId, queryClient]);
};
