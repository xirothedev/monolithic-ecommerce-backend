import { BadRequestException } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

/**
 * Image file interceptor with validation
 * @param fieldName - Name of the field containing the image file
 * @param maxSize - Maximum file size in MB (default: 5MB)
 * @returns FileInterceptor with image validation
 */
export const ImageInterceptor = (fieldName: string, maxSize: number = 5) => {
  return FileInterceptor(fieldName, {
    limits: {
      fileSize: maxSize * 1024 * 1024, // Convert MB to bytes
    },
    fileFilter: (req, file, callback) => {
      // Validate file extension
      if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
        return callback(new BadRequestException('Only image files (jpg, jpeg, png, webp) are allowed!'), false);
      }

      // Validate mimetype
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        return callback(new BadRequestException('Invalid image file type!'), false);
      }

      callback(null, true);
    },
  });
};

/**
 * Multiple images interceptor with validation
 * @param fieldName - Name of the field containing the image files
 * @param maxFiles - Maximum number of files allowed (default: 10)
 * @param maxSize - Maximum file size in MB per file (default: 5MB)
 * @returns FilesInterceptor with image validation
 */
export const ImagesInterceptor = (fieldName: string, maxFiles: number = 10, maxSize: number = 5) => {
  return FilesInterceptor(fieldName, maxFiles, {
    limits: {
      fileSize: maxSize * 1024 * 1024, // Convert MB to bytes
    },
    fileFilter: (req, file, callback) => {
      // Validate file extension
      if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
        return callback(new BadRequestException('Only image files (jpg, jpeg, png, webp) are allowed!'), false);
      }

      // Validate mimetype
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        return callback(new BadRequestException('Invalid image file type!'), false);
      }

      callback(null, true);
    },
  });
};
