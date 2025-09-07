import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';
import { uploadToS3, deleteFromS3, generatePresignedUploadUrl, generatePresignedUrl } from '../utils/s3';

const router = Router();
const prisma = new PrismaClient();

// GET all lectures for a specific course
router.get('/course/:courseId', authenticate, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.userId;
    const isAdmin = req.user?.isAdmin;

    // Admins can access all lectures, others need to purchase
    if (!isAdmin) {
      const purchase = await prisma.coursePurchase.findFirst({
        where: { userId, courseId, status: 'active' },
      });

      if (!purchase) {
        return res.status(403).json({ error: 'You need to purchase this course to access lectures.' });
      }
    }

    // For admins, show all lectures (published and unpublished)
    // For students, show only published lectures
    const whereClause = isAdmin 
      ? { courseId }
      : { courseId, isPublished: true };

    const lectures = await prisma.lecture.findMany({
      where: whereClause,
      orderBy: { order: 'asc' },
    });

    return res.json({ lectures });
  } catch (error) {
    console.error('Error fetching lectures:', error);
    return res.status(500).json({ error: 'Sorry, we could not load the lectures. Please try again later.' });
  }
});

// GET a single lecture by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const isAdmin = req.user?.isAdmin;

    const lecture = await prisma.lecture.findUnique({
      where: { id },
      include: { course: true },
    });

    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found.' });
    }

    // Admins can access all lectures, others need to purchase
    if (!isAdmin) {
      const purchase = await prisma.coursePurchase.findFirst({
        where: { userId, courseId: lecture.courseId, status: 'active' },
      });

      if (!purchase) {
        return res.status(403).json({ error: 'You need to purchase this course to access lectures.' });
      }
    }

    return res.json({ lecture });
  } catch (error) {
    console.error('Error fetching lecture:', error);
    return res.status(500).json({ error: 'Sorry, we could not load the lecture. Please try again later.' });
  }
});

// POST create a new lecture (admin only)
router.post('/', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }

    const { title, description, courseId, order, duration } = req.body;

    if (!title || !courseId) {
      return res.status(400).json({ error: 'Please provide title and courseId.' });
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const lecture = await prisma.lecture.create({
      data: {
        title,
        description,
        courseId,
        order: order || 0,
        duration,
      },
    });

    return res.status(201).json({ lecture });
  } catch (error) {
    console.error('Error creating lecture:', error);
    return res.status(500).json({ error: 'Sorry, we could not create the lecture. Please try again.' });
  }
});

// PUT update a lecture (admin only)
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }

    const { id } = req.params;
    const { title, description, order, duration, isPublished } = req.body;

    const lecture = await prisma.lecture.update({
      where: { id },
      data: {
        title,
        description,
        order,
        duration,
        isPublished,
      },
    });

    return res.json({ lecture });
  } catch (error) {
    console.error('Error updating lecture:', error);
    return res.status(500).json({ error: 'Sorry, we could not update the lecture. Please try again.' });
  }
});

// DELETE a lecture (admin only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }

    const { id } = req.params;

    // Get lecture to delete video and thumbnail from S3
    const lecture = await prisma.lecture.findUnique({ where: { id } });
    if (lecture) {
      try {
        if (lecture.videoUrl) {
          await deleteFromS3(lecture.videoUrl);
        }
        if (lecture.thumbnailUrl) {
          await deleteFromS3(lecture.thumbnailUrl);
        }
      } catch (s3Error) {
        console.error('S3 delete error:', s3Error);
        // Continue with database deletion even if S3 delete fails
      }
    }

    await prisma.lecture.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting lecture:', error);
    return res.status(500).json({ error: 'Sorry, we could not delete the lecture. Please try again.' });
  }
});

// POST upload video for a lecture (admin only)
router.post('/:id/upload-video', authenticate, uploadToS3('lecture-videos').single('video'), async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }

    const { id } = req.params;
    const file = req.file as any;

    if (!file) {
      return res.status(400).json({ error: 'Please select a video file to upload.' });
    }

    // Check if lecture exists
    const lecture = await prisma.lecture.findUnique({ where: { id } });
    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found.' });
    }

    // Delete old video if exists
    if (lecture.videoUrl) {
      try {
        await deleteFromS3(lecture.videoUrl);
      } catch (s3Error) {
        console.error('S3 delete error:', s3Error);
      }
    }

    // Update lecture with new video URL
    const updatedLecture = await prisma.lecture.update({
      where: { id },
      data: { videoUrl: file.location },
    });

    return res.json({ success: true, lecture: updatedLecture, message: 'Video uploaded successfully.' });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Sorry, we could not upload the video. Please try again.' });
  }
});

// POST upload thumbnail for a lecture (admin only)
router.post('/:id/upload-thumbnail', authenticate, uploadToS3('lecture-thumbnails').single('thumbnail'), async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }

    const { id } = req.params;
    const file = req.file as any;

    if (!file) {
      return res.status(400).json({ error: 'Please select a thumbnail image to upload.' });
    }

    // Check if lecture exists
    const lecture = await prisma.lecture.findUnique({ where: { id } });
    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found.' });
    }

    // Delete old thumbnail if exists
    if (lecture.thumbnailUrl) {
      try {
        await deleteFromS3(lecture.thumbnailUrl);
      } catch (s3Error) {
        console.error('S3 delete error:', s3Error);
      }
    }

    // Update lecture with new thumbnail URL
    const updatedLecture = await prisma.lecture.update({
      where: { id },
      data: { thumbnailUrl: file.location },
    });

    return res.json({ success: true, lecture: updatedLecture, message: 'Thumbnail uploaded successfully.' });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Sorry, we could not upload the thumbnail. Please try again.' });
  }
});

// Generate presigned upload URL for lecture video
router.post('/:id/presigned-video-upload', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }

    const { id } = req.params;
    const { fileName, contentType } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({ error: 'Please provide both file name and content type.' });
    }

    // Check if lecture exists
    const lecture = await prisma.lecture.findUnique({ where: { id } });
    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found.' });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const key = `lecture-videos/${uniqueSuffix}-${fileName}`;
    const url = await generatePresignedUploadUrl(key, contentType);

    return res.json({ url, key });
  } catch (error) {
    console.error('Error generating presigned upload URL:', error);
    return res.status(500).json({ error: 'Sorry, we could not generate an upload link. Please try again.' });
  }
});

// Generate presigned upload URL for lecture thumbnail
router.post('/:id/presigned-thumbnail-upload', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }

    const { id } = req.params;
    const { fileName, contentType } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({ error: 'Please provide both file name and content type.' });
    }

    // Check if lecture exists
    const lecture = await prisma.lecture.findUnique({ where: { id } });
    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found.' });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const key = `lecture-thumbnails/${uniqueSuffix}-${fileName}`;
    const url = await generatePresignedUploadUrl(key, contentType);

    return res.json({ url, key });
  } catch (error) {
    console.error('Error generating presigned upload URL:', error);
    return res.status(500).json({ error: 'Sorry, we could not generate an upload link. Please try again.' });
  }
});

// GET presigned URL for lecture video
router.get('/:id/video-url', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const isAdmin = req.user?.isAdmin;

    const lecture = await prisma.lecture.findUnique({
      where: { id },
      include: { course: true },
    });

    if (!lecture || !lecture.videoUrl) {
      return res.status(404).json({ error: 'Lecture or video not found.' });
    }

    // Admins can access all videos, others need to purchase
    if (!isAdmin) {
      const purchase = await prisma.coursePurchase.findFirst({
        where: { userId, courseId: lecture.courseId, status: 'active' },
      });

      if (!purchase) {
        return res.status(403).json({ error: 'You need to purchase this course to access lectures.' });
      }
    }

    const url = await generatePresignedUrl(lecture.videoUrl, 3600); // 1 hour
    return res.json({ url });
  } catch (error) {
    console.error('Error generating video URL:', error);
    return res.status(500).json({ error: 'Sorry, we could not generate the video link. Please try again.' });
  }
});

// GET presigned URL for lecture thumbnail
router.get('/:id/thumbnail-url', async (req, res) => {
  try {
    const { id } = req.params;

    const lecture = await prisma.lecture.findUnique({ where: { id } });
    if (!lecture || !lecture.thumbnailUrl) {
      return res.status(404).json({ error: 'Lecture or thumbnail not found.' });
    }

    const url = await generatePresignedUrl(lecture.thumbnailUrl, 300); // 5 minutes
    return res.json({ url });
  } catch (error) {
    console.error('Error generating thumbnail URL:', error);
    return res.status(500).json({ error: 'Sorry, we could not generate the thumbnail link. Please try again.' });
  }
});

export default router;
