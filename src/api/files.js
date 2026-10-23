const EXTENSIONS = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const RESUME_TYPES = Object.keys(EXTENSIONS).filter((type) => type.startsWith("application/"));
export const LOGO_TYPES = Object.keys(EXTENSIONS).filter((type) => type.startsWith("image/"));
export const MAX_RESUME_BYTES = 5 * 1024 * 1024; // same limits as the buckets (migration)
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/**
 * Builds an unguessable storage path inside the user's own folder:
 * "<clerk user id>/<prefix><uuid>.<ext>" (the storage RLS policies check the folder).
 */
export const storagePath = (userId, file, prefix = "") => {
  const extension = EXTENSIONS[file.type];
  if (!extension) throw new Error("Unsupported file type");
  return `${userId}/${prefix}${crypto.randomUUID()}.${extension}`;
};
