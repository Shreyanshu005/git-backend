import { S3Client, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import multerS3 from 'multer-s3';
// Multer S3 configuration

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

// Configure multer for S3 uploads
export const uploadToS3 = (folder: string) => {
  console.log(`Configuring S3 upload for folder: ${folder}`);
  console.log(`S3 Bucket: ${BUCKET_NAME}, Region: ${process.env.AWS_REGION || 'us-east-1'}`);
  
  return multer({
    storage: multerS3({
      s3: s3Client,
      bucket: BUCKET_NAME,
      // Remove the acl parameter since we're not using ACLs
      metadata: function (_req: any, file: Express.Multer.File, cb: (error: any, metadata?: any) => void) {
        console.log(`Processing file metadata: ${file.fieldname} - ${file.originalname}`);
        cb(null, { 
          fieldName: file.fieldname,
          originalName: file.originalname,
          mimeType: file.mimetype,
          ContentDisposition: 'inline',
          CacheControl: 'public, max-age=31536000' // 1 year cache
        });
      },
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: function (_req: any, file: Express.Multer.File, cb: (error: any, key?: string) => void) {
        try {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
          const fileName = `${folder}/${uniqueSuffix}-${sanitizedFileName}`;
          console.log(`Generated S3 key: ${fileName}`);
          cb(null, fileName);
        } catch (error) {
          console.error('Error generating S3 key:', error);
          cb(error as Error);
        }
      },
    }),
fileFilter: (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
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
    // limits: { fileSize: 100 * 1024 * 1024 }, // Remove file size limit
  });
};

// Delete file from S3
export const deleteFromS3 = async (fileUrlOrKey: string): Promise<void> => {
  try {
    let key: string;
    // If it's a full URL, extract the key; otherwise, use as key directly
    if (fileUrlOrKey.startsWith('http')) {
      const url = new URL(fileUrlOrKey);
      key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
    } else {
      key = fileUrlOrKey;
    }
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    await s3Client.send(command);
  } catch (error) {
    // console.log(error);
    console.error('Error deleting file from S3:', error);
    throw error;
  }
};

// Generate presigned URL for private files (if needed)
export const generatePresignedUrl = async (fileUrlOrKey: string, expiresIn = 3600): Promise<string> => {
  try {
    let key = fileUrlOrKey;
    // If it's a full URL, extract the key
    if (fileUrlOrKey.startsWith('http')) {
      const url = new URL(fileUrlOrKey);
      key = url.pathname.substring(1);
    }
    // Set Content-Disposition: inline and Content-Type: application/pdf for PDFs
    const isPdf = key.toLowerCase().endsWith('.pdf');
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ...(isPdf ? {
        ResponseContentDisposition: 'inline',
        ResponseContentType: 'application/pdf'
      } : {})
    });
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
};

// Generate a pre-signed S3 upload URL
export const generatePresignedUploadUrl = async (key: string, contentType: string, expiresIn = 600) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    // Do not set any checksum or x-amz-sdk-checksum-algorithm
  });
  return getSignedUrl(s3Client, command, { expiresIn });
};

// Convert a file key or URL to a pre-signed URL with long expiration
export async function convertToPublicUrl(fileUrlOrKey: string): Promise<string> {
  try {
    if (!fileUrlOrKey) return '';
    
    // If it's already a URL, extract the key
    let key = fileUrlOrKey;
    if (key.startsWith('http')) {
      const url = new URL(key);
      key = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    }
    
    // Remove any leading slashes
    const cleanKey = key.startsWith('/') ? key.substring(1) : key;
    
    // Generate a pre-signed URL that's valid for 7 days (604800 seconds)
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: cleanKey,
      ResponseContentDisposition: 'inline'
    });
    
    return await getSignedUrl(s3Client, command, { expiresIn: 604800 }); // 7 days
  } catch (error) {
    console.error('Error converting to public URL:', error);
    return fileUrlOrKey; // Return original if conversion fails
  }
}

// Generate public URL for file access (async version)
export const getPublicUrl = async (key: string): Promise<string> => {
  return convertToPublicUrl(key);
};