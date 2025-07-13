# AWS S3 Setup for File Uploads

This guide will help you set up AWS S3 for storing course thumbnails, current affairs PDFs, and DPQ PDFs.

## Prerequisites

1. AWS Account
2. Node.js and npm installed
3. Your backend project set up

## Step 1: Create S3 Bucket

1. Go to [AWS S3 Console](https://console.aws.amazon.com/s3/)
2. Click "Create bucket"
3. Choose a unique bucket name (e.g., `your-app-name-uploads`)
4. Select a region close to your users
5. **Important**: Enable "Block all public access" (we'll control access via signed URLs)
6. Click "Create bucket"

## Step 2: Create IAM User

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click "Users" → "Create user"
3. Enter username (e.g., `your-app-s3-user`)
4. Select "Programmatic access"
5. Click "Next: Permissions"
6. Click "Attach existing policies directly"
7. Search for and select `AmazonS3FullAccess` (or create a custom policy for better security)
8. Complete the user creation
9. **Save the Access Key ID and Secret Access Key**

## Step 3: Configure Environment Variables

Add these to your `.env` file:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-app-name-uploads
```

## Step 4: Test the Setup

1. Start your backend server
2. Try uploading a file through your admin interface
3. Check the S3 bucket to see if files are uploaded
4. Verify that the S3 URLs are stored in your database

## Security Best Practices

1. **Use IAM Roles** (for production on AWS)
2. **Restrict bucket permissions** to only what's needed
3. **Enable bucket versioning** for backup
4. **Set up lifecycle policies** to manage old files
5. **Use CloudFront** for better performance (optional)

## Troubleshooting

### Common Issues:

1. **Access Denied**: Check IAM permissions and bucket policy
2. **Bucket Not Found**: Verify bucket name and region
3. **Invalid Credentials**: Double-check access keys
4. **CORS Errors**: Configure CORS on your S3 bucket if needed

### CORS Configuration (if needed):

If you get CORS errors, add this to your S3 bucket CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

## File Structure in S3

Your files will be organized as:
- `course-thumbnails/` - Course images
- `current-affairs/` - Current affairs PDFs
- `dpq/` - Daily practice question PDFs

## Cost Optimization

1. **Use S3 Standard-IA** for files accessed less frequently
2. **Set up lifecycle policies** to move old files to cheaper storage
3. **Monitor usage** with AWS Cost Explorer
4. **Use CloudFront** to reduce S3 requests

## Migration from Local Storage

If you have existing files in your local `uploads/` directory:

1. Upload them to S3 manually or write a migration script
2. Update your database records with the new S3 URLs
3. Remove the local files after confirming everything works 