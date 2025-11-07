import { BadRequestException } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

/**
 * Media file interceptor with validation for images, GIFs and videos
 * @param fieldName - Name of the field containing the media file
 * @returns FileInterceptor with media validation
 */
export const MediaInterceptor = (fieldName: string) => {
  return FileInterceptor(fieldName, {
    fileFilter: (req, file, callback) => {
      const imageRegex = /\.(jpg|jpeg|png|webp)$/;
      const gifRegex = /\.gif$/;
      const videoRegex = /\.mp4$/;

      // Check file size limits based on type
      if (imageRegex.test(file.originalname) && file.size > 5 * 1024 * 1024) {
        return callback(
          new BadRequestException({
            message: 'Image files must be less than 5MB!',
          }),
          false,
        );
      }

      if (gifRegex.test(file.originalname) && file.size > 10 * 1024 * 1024) {
        return callback(
          new BadRequestException({
            message: 'GIF files must be less than 10MB!',
          }),
          false,
        );
      }

      if (videoRegex.test(file.originalname) && file.size > 25 * 1024 * 1024) {
        return callback(
          new BadRequestException({
            message: 'Video files must be less than 25MB!',
          }),
          false,
        );
      }

      // Check allowed file types
      if (
        !imageRegex.test(file.originalname) &&
        !gifRegex.test(file.originalname) &&
        !videoRegex.test(file.originalname)
      ) {
        return callback(
          new BadRequestException({
            message: 'Only image, GIF, and video files are allowed!',
          }),
          false,
        );
      }

      callback(null, true);
    },
  });
};

/**
 * Multiple media files interceptor with validation
 * @param fieldName - Name of the field containing the media files
 * @param maxFiles - Maximum number of files allowed (default: 20)
 * @returns FilesInterceptor with media validation
 */
export const MediasInterceptor = (fieldName: string, maxFiles: number = 20) => {
  return FilesInterceptor(fieldName, maxFiles, {
    fileFilter: (req, file, callback) => {
      const imageRegex = /\.(jpg|jpeg|png|webp)$/;
      const gifRegex = /\.gif$/;
      const videoRegex = /\.mp4$/;

      // Check file size limits based on type
      if (imageRegex.test(file.originalname) && file.size > 5 * 1024 * 1024) {
        return callback(
          new BadRequestException({
            message: 'Image files must be less than 5MB!',
          }),
          false,
        );
      }

      if (gifRegex.test(file.originalname) && file.size > 10 * 1024 * 1024) {
        return callback(
          new BadRequestException({
            message: 'GIF files must be less than 10MB!',
          }),
          false,
        );
      }

      if (videoRegex.test(file.originalname) && file.size > 25 * 1024 * 1024) {
        return callback(
          new BadRequestException({
            message: 'Video files must be less than 25MB!',
          }),
          false,
        );
      }

      // Check allowed file types
      if (
        !imageRegex.test(file.originalname) &&
        !gifRegex.test(file.originalname) &&
        !videoRegex.test(file.originalname)
      ) {
        return callback(
          new BadRequestException({
            message: 'Only image, GIF, and video files are allowed!',
          }),
          false,
        );
      }

      callback(null, true);
    },
  });
};
