import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { Request } from 'express';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

// Configure multer for S3 uploads
export const uploadToS3 = (folder: string) => {
  return multer({
    storage: multerS3({
      s3: s3Client,
      bucket: BUCKET_NAME,
      metadata: function (_req: Request, file: Express.Multer.File, cb: (error: any, metadata?: any) => void) {
        cb(null, { fieldName: file.fieldname });
      },
      key: function (_req: Request, file: Express.Multer.File, cb: (error: any, key?: string) => void) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileName = `${folder}/${uniqueSuffix}-${file.originalname}`;
        cb(null, fileName);
      },
    }),
    fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      // Allow PDFs for current affairs and DPQ
      if (folder === 'current-affairs' || folder === 'dpq') {
        if (file.mimetype !== 'application/pdf') {
          return cb(new Error('Only PDF files are allowed'));
        }
      }
      // Allow images for course thumbnails
      if (folder === 'course-thumbnails') {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new Error('Only image files are allowed'));
        }
      }
      cb(null, true);
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  });
};

// Delete file from S3
export const deleteFromS3 = async (fileUrl: string): Promise<void> => {
  try {
    // Extract key from S3 URL
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // Remove leading slash
    
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw error;
  }
};

// Generate presigned URL for private files (if needed)
export const generatePresignedUrl = async (fileUrl: string, expiresIn = 3600): Promise<string> => {
  try {
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1);
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
};

// Get public URL for file
export const getPublicUrl = (key: string): string => {
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}; 