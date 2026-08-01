// components/ProfilePhotoUploader.tsx

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateProfilePhoto, useUserProfileQuery } from "@/hooks/use-user";

export const ProfilePhotoUploader = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { data: user, refetch } = useUserProfileQuery();
    const { mutateAsync: updateProfilePhoto } = useUpdateProfilePhoto();

    const handleUpload = async () => {
  const file = fileInputRef.current?.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("avatar", file);

  setIsLoading(true);
  toast.loading("Uploading...");

  try {
    const result = await updateProfilePhoto(formData);

    // profilePicture is already a fully-qualified storage URL
    if (result?.profilePicture) {
      setPreview(result.profilePicture);
    }

    toast.success("Photo updated!");
    if (fileInputRef.current) fileInputRef.current.value = "";
    await refetch();
  } catch (err) {
    console.error("Upload failed", err);
    toast.error("Upload failed");
  } finally {
    setIsLoading(false);
  }
};

// For displaying existing profile picture
const currentImageUrl = preview || user?.profilePicture || null;


    const handleFileChange = () => {
        const file = fileInputRef.current?.files?.[0];
        if (file) {
            const fileURL = URL.createObjectURL(file);
            setPreview(fileURL);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    

    return (
        <div className="flex items-center gap-4">
            <div
                className="relative w-[100px] h-[100px] rounded-full border shadow-sm cursor-pointer overflow-hidden"
                onClick={handleAvatarClick}
            >
                {currentImageUrl ? (
                    <img
                        src={currentImageUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex items-center justify-center w-full h-full text-sm text-gray-500">
                        No Photo
                    </div>
                )}
                <div className="absolute bottom-1 right-1 bg-white p-1 rounded-full shadow">
                    <Camera size={18} />
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />

            <Button
                onClick={handleUpload}
                disabled={isLoading}
                className={cn("mt-2", isLoading && "opacity-50")}
            >
                {isLoading ? "Uploading..." : "Upload"}
            </Button>
        </div>
    );
};
