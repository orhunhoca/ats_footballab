import { supabase } from "@/integrations/supabase/client";

const STUDENT_PHOTOS_BUCKET = "student-photos";

export const storageService = {
  // Upload student photo
  async uploadStudentPhoto(file: File, studentId: string): Promise<string> {
    try {
      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${studentId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload file
      const { data, error } = await supabase.storage
        .from(STUDENT_PHOTOS_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true
        });

      if (error) {
        console.error("Error uploading photo:", error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(STUDENT_PHOTOS_BUCKET)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error in uploadStudentPhoto:", error);
      throw error;
    }
  },

  // Delete student photo
  async deleteStudentPhoto(photoUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const urlParts = photoUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];

      const { error } = await supabase.storage
        .from(STUDENT_PHOTOS_BUCKET)
        .remove([fileName]);

      if (error) {
        console.error("Error deleting photo:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error in deleteStudentPhoto:", error);
      throw error;
    }
  },

  // Get photo URL
  getPhotoUrl(photoUrl: string | null | undefined): string | null {
    if (!photoUrl) return null;
    return photoUrl;
  }
};