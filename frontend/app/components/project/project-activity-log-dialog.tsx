import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader } from "@/components/ui/loader";
import { getActivityIcon } from "@/components/task/task-icon";
import { useProjectActivityQuery } from "@/hooks/use-project-activity";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProjectActivityLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | undefined;
}

export const ProjectActivityLogDialog = ({
  open,
  onOpenChange,
  projectId,
}: ProjectActivityLogDialogProps) => {
  const [page, setPage] = useState(1);
  const { data, isPending } = useProjectActivityQuery(projectId, page, open);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setPage(1);
      }}
    >
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Activity Log</DialogTitle>
          <DialogDescription>
            A full audit trail of everything that has happened in this project.
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="flex justify-center py-8">
            <Loader />
          </div>
        ) : !data || data.activity.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No activity recorded yet.
          </p>
        ) : (
          <div className="space-y-0">
            {data.activity.map((entry, index) => (
              <div key={entry._id} className="relative flex gap-3 pb-5 last:pb-0">
                {index !== data.activity.length - 1 && (
                  <div className="absolute top-8 bottom-0 left-4 w-[2px] bg-slate-100" />
                )}
                {getActivityIcon(entry.action as any)}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={entry.user?.profilePicture} />
                      <AvatarFallback className="text-[10px]">
                        {entry.user?.name?.charAt(0).toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{entry.user?.name ?? "Unknown user"}</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {entry.details?.description ?? entry.action.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="mr-1 size-4" /> Prev
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
