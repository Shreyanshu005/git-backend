import express from 'express';
import { PrismaClient } from '@prisma/client';
// import { uploadToS3, deleteFromS3 } from '../utils/s3';
import { authenticate } from '../middlewares/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all e-books (public endpoint)
router.get('/ebooks', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { isActive: true };
    
    if (category) {
      where.category = category;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { subtitle: { contains: search as string, mode: 'insensitive' } },
        { author: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [ebooks, total] = await Promise.all([
      prisma.eBook.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          subtitle: true,
          author: true,
          category: true,
          coverImage: true,
          fileSize: true,
          pages: true,
          language: true,
          createdAt: true
        }
      }),
      prisma.eBook.count({ where })
    ]);

    res.json({
      ebooks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching e-books:', error);
    res.status(500).json({ error: 'Failed to fetch e-books' });
  }
});

// Get e-book details (public endpoint)
router.get('/ebooks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ebook = await prisma.eBook.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        subtitle: true,
        description: true,
        author: true,
        category: true,
        coverImage: true,
        fileSize: true,
        pages: true,
        language: true,
        createdAt: true
      }
    });
    if (!ebook) {
      return res.status(404).json({ error: 'E-book not found' });
    }
    return res.json(ebook);
  } catch (error) {
    console.error('Error fetching e-book:', error);
    return res.status(500).json({ error: 'Failed to fetch e-book' });
  }
});

// Download e-book (requires subscription)
router.get('/ebooks/:id/download', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any)?.userId;

    // Check if user has active subscription
    const subscription = await prisma.digitalLibrarySubscription.findFirst({
      where: {
        userId,
        status: 'active',
        OR: [
          { subscriptionType: 'lifetime' },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    if (!subscription) {
      return res.status(403).json({ 
        error: 'Subscription required',
        message: 'You need an active digital library subscription to download e-books. Get unlimited access for just ₹499!'
      });
    }

    // Get e-book details
    const ebook = await prisma.eBook.findUnique({
      where: { id, isActive: true }
    });

    if (!ebook) {
      return res.status(404).json({ error: 'E-book not found' });
    }

    // Return the PDF URL for download
    return res.json({ 
      downloadUrl: ebook.pdfUrl,
      title: ebook.title
    });
  } catch (error) {
    console.error('Error downloading e-book:', error);
    return res.status(500).json({ error: 'Failed to download e-book' });
  }
});

// Check user subscription status
router.get('/subscription/status', authenticate, async (req, res) => {
  try {
    const userId = (req.user as any)?.userId;
    
    const subscription = await prisma.digitalLibrarySubscription.findFirst({
      where: {
        userId,
        status: 'active',
        OR: [
          { subscriptionType: 'lifetime' },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { purchasedAt: 'desc' }
    });

    return res.json({
      hasSubscription: !!subscription,
      subscription: subscription ? {
        type: subscription.subscriptionType,
        purchasedAt: subscription.purchasedAt,
        expiresAt: subscription.expiresAt,
        status: subscription.status
      } : null
    });
  } catch (error) {
    console.error('Error checking subscription:', error);
    return res.status(500).json({ error: 'Failed to check subscription status' });
  }
});

// Create subscription (simplified - in real app, integrate with payment gateway)
router.post('/subscription/create', authenticate, async (req, res) => {
  try {
    const userId = (req.user as any)?.userId;
    const { paymentId } = req.body;

    console.log('🔔 Subscription endpoint called. req.user:', req.user, 'paymentId:', paymentId);

    // Check if user already has an active subscription
    const existingSubscription = await prisma.digitalLibrarySubscription.findFirst({
      where: {
        userId,
        status: 'active',
        OR: [
          { subscriptionType: 'lifetime' },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    if (existingSubscription) {
      console.log('User already has active subscription:', existingSubscription.id);
      return res.status(400).json({ 
        error: 'Active subscription exists',
        message: 'You already have an active digital library subscription.'
      });
    }

    // Create new subscription
    const subscription = await prisma.digitalLibrarySubscription.create({
      data: {
        userId,
        subscriptionType: 'lifetime',
        amount: 49900, // ₹499 in paise
        status: 'active',
        paymentId: paymentId || `manual_${Date.now()}`
      }
    });

    console.log('✅ Subscription created successfully:', subscription.id);

    return res.json({
      message: 'Subscription created successfully',
      subscription: {
        id: subscription.id,
        type: subscription.subscriptionType,
        amount: subscription.amount / 100, // Convert back to rupees
        status: subscription.status,
        purchasedAt: subscription.purchasedAt
      }
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Admin endpoints for managing e-books (simplified without S3)
router.post('/admin/ebooks', authenticate, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    // Check if user is admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { title, subtitle, description, author, category, pages, language, coverImage, pdfUrl, fileSize } = req.body;
    
    if (!title || !author || !category) {
      return res.status(400).json({ error: 'Title, author, and category are required' });
    }
    
    const ebook = await prisma.eBook.create({
      data: {
        title,
        subtitle: subtitle || '',
        description: description || '',
        author,
        category,
        coverImage: coverImage || '/uploads/default-cover.jpg',
        pdfUrl: pdfUrl || '/uploads/sample.pdf',
        fileSize: fileSize || '2.5 MB',
        pages: parseInt(pages) || 100,
        language: language || 'English'
      }
    });
    
    return res.json({
      message: 'E-book created successfully',
      ebook: {
        id: ebook.id,
        title: ebook.title,
        coverImage: ebook.coverImage
      }
    });
  } catch (error) {
    console.error('Error creating e-book:', error);
    return res.status(500).json({ error: 'Failed to create e-book' });
  }
});

// Update e-book - TEMPORARILY DISABLED
// router.put('/admin/ebooks/:id', authenticate, uploadToS3('digital-library').fields([
//   { name: 'coverImage', maxCount: 1 },
//   { name: 'pdfFile', maxCount: 1 }
// ]), async (req, res) => {
//   try {
//     const userId = (req.user as any)?.id;
//     const { id } = req.params;
//     // Check if user is admin
//     const user = await prisma.user.findUnique({ where: { id: userId } });
//     if (!user?.isAdmin) {
//       return res.status(403).json({ error: 'Admin access required' });
//     }
//     const files = req.files as { [fieldname: string]: Express.Multer.File[] };
//     const updateData: any = { ...req.body };
//     // If coverImage is being updated, delete old image from S3
//     if (files.coverImage?.[0]) {
//       const existingEbook = await prisma.eBook.findUnique({ where: { id } });
//       if (existingEbook && existingEbook.coverImage && existingEbook.coverImage !== files.coverImage[0].location) {
//         try {
//           await deleteFromS3(existingEbook.coverImage);
//         } catch (s3Error) {
//           console.error('S3 delete error:', s3Error);
//         }
//       }
//       updateData.coverImage = files.coverImage[0].location;
//     }
//     // If pdfFile is being updated, delete old PDF from S3
//     if (files.pdfFile?.[0]) {
//       const existingEbook = await prisma.eBook.findUnique({ where: { id } });
//       if (existingEbook && existingEbook.pdfUrl && existingEbook.pdfUrl !== files.pdfFile[0].location) {
//         try {
//           await deleteFromS3(existingEbook.pdfUrl);
//         } catch (s3Error) {
//           console.error('S3 delete error:', s3Error);
//         }
//       }
//       updateData.pdfUrl = files.pdfFile[0].location;
//       updateData.fileSize = `${(files.pdfFile[0].size / (1024 * 1024)).toFixed(1)} MB`;
//     }
//     if (updateData.pages) {
//       updateData.pages = parseInt(updateData.pages);
//     }
//     const ebook = await prisma.eBook.update({
//       where: { id },
//       data: updateData
//     });
//     return res.json({
//       message: 'E-book updated successfully',
//       ebook: {
//         id: ebook.id,
//         title: ebook.title,
//         coverImage: ebook.coverImage
//       }
//     });
//   } catch (error) {
//     console.error('Error updating e-book:', error);
//     return res.status(500).json({ error: 'Failed to update e-book' });
//   }
// });

// Delete e-book
router.delete('/admin/ebooks/:id', authenticate, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const { id } = req.params;
    // Check if user is admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    // Check if ebook exists before deleting
    const existingEbook = await prisma.eBook.findUnique({ where: { id } });
    if (!existingEbook) {
      return res.status(404).json({ error: 'E-book not found' });
    }
    
    // Delete cover image and PDF from S3 (commented out for now)
    // if (existingEbook.coverImage) {
    //   try {
    //     await deleteFromS3(existingEbook.coverImage);
    //   } catch (s3Error) {
    //     console.error('S3 delete error:', s3Error);
    //   }
    // }
    // if (existingEbook.pdfUrl) {
    //   try {
    //     await deleteFromS3(existingEbook.pdfUrl);
    //   } catch (s3Error) {
    //     console.error('S3 delete error:', s3Error);
    //   }
    // }
    await prisma.eBook.delete({ where: { id } });
    return res.json({ message: 'E-book deleted successfully' });
  } catch (error) {
    console.error('Error deleting e-book:', error);
    return res.status(500).json({ error: 'Failed to delete e-book' });
  }
});

// Get all e-books for admin
router.get('/admin/ebooks', authenticate, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    
    // Check if user is admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const ebooks = await prisma.eBook.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return res.json(ebooks);
  } catch (error) {
    console.error('Error fetching e-books for admin:', error);
    return res.status(500).json({ error: 'Failed to fetch e-books' });
  }
});

// Seed sample e-books (for testing)
router.post('/seed-ebooks', authenticate, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    // Check if user is admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const sampleEbooks = [
      {
        title: 'UPSC CSE Complete Guide 2024',
        subtitle: 'Comprehensive preparation strategy and study materials',
        description: 'A complete guide covering all aspects of UPSC Civil Services Examination including prelims, mains, and interview preparation.',
        author: 'IAS Academy',
        category: 'UPSC',
        coverImage: '/uploads/upsc-guide.jpg',
        pdfUrl: '/uploads/upsc-complete-guide.pdf',
        fileSize: '15.2 MB',
        pages: 450,
        language: 'English'
      },
      {
        title: 'Indian Polity and Constitution',
        subtitle: 'Essential concepts for competitive exams',
        description: 'Comprehensive coverage of Indian Constitution, political system, and governance structures.',
        author: 'Constitutional Expert',
        category: 'General Studies',
        coverImage: '/uploads/polity.jpg',
        pdfUrl: '/uploads/indian-polity.pdf',
        fileSize: '8.7 MB',
        pages: 320,
        language: 'English'
      },
      {
        title: 'Indian Economy: Concepts and Current Affairs',
        subtitle: 'Economic theory and contemporary issues',
        description: 'Detailed analysis of Indian economy, economic policies, and current economic developments.',
        author: 'Economic Analyst',
        category: 'General Studies',
        coverImage: '/uploads/economy.jpg',
        pdfUrl: '/uploads/indian-economy.pdf',
        fileSize: '12.1 MB',
        pages: 380,
        language: 'English'
      },
      {
        title: 'Geography of India and World',
        subtitle: 'Physical and human geography',
        description: 'Comprehensive coverage of Indian and world geography including physical, economic, and human geography.',
        author: 'Geography Expert',
        category: 'General Studies',
        coverImage: '/uploads/geography.jpg',
        pdfUrl: '/uploads/geography-india-world.pdf',
        fileSize: '10.5 MB',
        pages: 290,
        language: 'English'
      },
      {
        title: 'BPSC Preparation Strategy',
        subtitle: 'Complete guide for Bihar Public Service Commission',
        description: 'Strategic approach to BPSC examination with subject-wise preparation tips and previous year questions.',
        author: 'BPSC Expert',
        category: 'BPSC',
        coverImage: '/uploads/bpsc.jpg',
        pdfUrl: '/uploads/bpsc-strategy.pdf',
        fileSize: '9.3 MB',
        pages: 280,
        language: 'English'
      },
      {
        title: 'UPPCS Study Material',
        subtitle: 'Uttar Pradesh Public Service Commission preparation',
        description: 'Comprehensive study material for UPPCS examination covering all relevant subjects and topics.',
        author: 'UPPCS Expert',
        category: 'UPPCS',
        coverImage: '/uploads/uppcs.jpg',
        pdfUrl: '/uploads/uppcs-study-material.pdf',
        fileSize: '11.8 MB',
        pages: 350,
        language: 'English'
      }
    ];

    const createdEbooks = [];
    for (const ebookData of sampleEbooks) {
      const ebook = await prisma.eBook.create({
        data: ebookData
      });
      createdEbooks.push(ebook);
    }

    return res.json({
      message: 'Sample e-books created successfully',
      count: createdEbooks.length,
      ebooks: createdEbooks.map(ebook => ({
        id: ebook.id,
        title: ebook.title,
        category: ebook.category
      }))
    });
  } catch (error) {
    console.error('Error seeding e-books:', error);
    return res.status(500).json({ error: 'Failed to seed e-books' });
  }
});

export default router; 