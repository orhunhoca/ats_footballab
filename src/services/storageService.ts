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
    const fileName = photoUrl.split("/").pop();
    if (!fileName) return;

    const { error } = await supabase.storage
      .from("student-photos")
      .remove([fileName]);

    if (error) {
      throw error;
    }
  },

  // Upload any file to a bucket
  async uploadFile(
    file: Blob | File,
    fileName: string,
    bucketName: string = "documents"
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Check if bucket exists, if not create it (buckets usually created in dashboard, but good to handle)
      // For now assume bucket exists

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          upsert: true,
          contentType: 'application/pdf'
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      return { success: true, url: publicUrl };
    } catch (error) {
      console.error("Error uploading file:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Upload failed" 
      };
    }
  },

  // Get photo URL
  getPhotoUrl(photoUrl: string): string {
    if (!photoUrl) return "/placeholder.svg";
    if (photoUrl.startsWith("http")) return photoUrl;
    return photoUrl;
  }
};