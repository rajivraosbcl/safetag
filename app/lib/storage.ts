import { supabase } from "./supabase"

export const uploadRCFile = async (
  userId: string,
  file: File
): Promise<{ success: boolean; path?: string; error?: string }> => {
  try {
    const fileName = `${userId}_${Date.now()}_${file.name}`
    const { data, error } = await supabase.storage
      .from("rc-documents")
      .upload(`rc-copies/${fileName}`, file, {
        cacheControl: "3600",
        upsert: false,
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, path: data.path }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export const getRCFileUrl = (path: string) => {
  try {
    const { data } = supabase.storage
      .from("rc-documents")
      .getPublicUrl(path)

    return data.publicUrl
  } catch (err: any) {
    console.error("Error getting RC file URL:", err)
    return null
  }
}

export const deleteRCFile = async (path: string) => {
  try {
    const { error } = await supabase.storage
      .from("rc-documents")
      .remove([path])

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
