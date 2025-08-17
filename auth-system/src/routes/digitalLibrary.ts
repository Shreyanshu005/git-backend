import express from 'express';
import { PrismaClient } from '@prisma/client';
import { uploadToS3, getPublicUrl, convertToPublicUrl } from '../utils/s3';

// Define types for mock test questions
interface MockTestQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  options: string[];
  correctAnswer: number;
  testId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define the MockTest type with questions
interface MockTest {
  id: string;
  subject: string;
  difficulty: string;
  userId: string;
  expiresAt: Date;
  questions?: MockTestQuestion[];
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
  };
}



// Define types for mock test questions
interface MockTestQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  options: string[];
  correctAnswer: number;
  testId: string;
  createdAt?: Date;
  updatedAt?: Date;
}
import { authenticate } from '../middlewares/auth';

// Define types for mock test questions
interface MockTestQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  options: string[];
  correctAnswer: number;
  testId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define the MockTest type with questions
interface MockTest {
  id: string;
  subject: string;
  difficulty: string;
  userId: string;
  expiresAt: Date;
  questions?: MockTestQuestion[];
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
  };
}

// Extend the Prisma client type to include our custom models
type ExtendedPrismaClient = PrismaClient & {
  $queryRaw: <T = any>(query: TemplateStringsArray | string, ...values: any[]) => Promise<T[]>;
};

// Initialize Prisma client with proper typing
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
}) as unknown as ExtendedPrismaClient;

// Middleware to check for active digital library subscription
const checkSubscription = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check for active subscription
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
        error: 'Maheshan Digital Library subscription required',
        message: 'You need an active Maheshan Digital Library subscription to access this feature.'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking subscription:', error);
    return res.status(500).json({ error: 'Failed to verify subscription' });
  }
};



const router = express.Router();

// File upload endpoint for digital library
router.post('/upload', authenticate, uploadToS3('digital-library').fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'pdfFile', maxCount: 1 }
]), async (req, res) => {
  console.log('Upload endpoint hit');
  try {
    interface UploadedFile extends Express.Multer.File {
      key: string;
      location: string;
      size: number;
    }
    
    const files = req.files as { 
      coverImage?: UploadedFile[], 
      pdfFile?: UploadedFile[] 
    };
    
    console.log('Files received:', Object.keys(files));
    
    // Validate required files
    if (!files.coverImage?.[0] || !files.pdfFile?.[0]) {
      const errorMessage = !files.coverImage?.[0] 
        ? 'Cover image is required' 
        : 'PDF file is required';
      console.error('Validation error:', errorMessage);
      return res.status(400).json({ 
        success: false,
        error: errorMessage 
      });
    }

    // Get file size in MB
    const fileSize = (files.pdfFile[0].size / (1024 * 1024)).toFixed(2);
    
    // Generate pre-signed URLs for the uploaded files (valid for 1 hour)
    // Generate public URLs (no expiration)
    const [coverImageUrl, fileUrl] = await Promise.all([
      getPublicUrl(files.coverImage[0].key),
      getPublicUrl(files.pdfFile[0].key)
    ]);

    // Save to database
    const ebook = await prisma.eBook.create({
      data: {
        title: req.body.title || 'Untitled',
        author: req.body.author || 'Unknown',
        category: req.body.category || 'General',
        pages: parseInt(req.body.pages) || 0,
        language: req.body.language || 'English',
        coverImage: coverImageUrl,
        fileUrl: fileUrl,
        fileSize: `${fileSize} MB`,
        description: req.body.description || '',
        subtitle: req.body.subtitle || ''
      }
    });

    return res.json({
      success: true,
      message: 'E-book uploaded successfully',
      data: {
        id: ebook.id,
        title: ebook.title,
        coverImageUrl,
        fileUrl,
        fileSize: `${fileSize} MB`
      }
    });
  } catch (error) {
    console.error('Error handling file upload:', error);
    return res.status(500).json({ 
      error: 'Failed to process file upload' 
    });
  }
});

// Define types for mock test questions
interface MockTestQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  options: string[];
  correctAnswer: number;
  testId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define the MockTest type with questions
interface MockTest {
  id: string;
  subject: string;
  difficulty: string;
  userId: string;
  expiresAt: Date;
  questions?: MockTestQuestion[];
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
  };
}





// Extend the Prisma client type to include our models
// type ExtendedPrismaClient = PrismaClient & {
//   mockTest: any;
//   mockTestQuestion: any;
// };

// // Initialize Prisma client with proper typing
// const prisma = new PrismaClient({
//   log: ['query', 'info', 'warn', 'error'],
// }) as unknown as ExtendedPrismaClient;


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

    const [rawEbooks, total] = await Promise.all([
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
          fileUrl: true,
          fileSize: true,
          pages: true,
          language: true,
          createdAt: true
        }
      }),
      prisma.eBook.count({ where })
    ]);

    // Convert all URLs to pre-signed URLs with long expiration
    const ebooks = await Promise.all(rawEbooks.map(async (ebook) => ({
      ...ebook,
      fileUrl: await convertToPublicUrl(ebook.fileUrl),
      coverImage: await convertToPublicUrl(ebook.coverImage)
    })));

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
        fileUrl: true,
        fileSize: true,
        pages: true,
        language: true,
        createdAt: true
      }
    });
    
    if (!ebook) {
      return res.status(404).json({ error: 'E-book not found' });
    }
    
    // Convert to pre-signed URLs with long expiration
    const [coverImageUrl, fileUrl] = await Promise.all([
      convertToPublicUrl(ebook.coverImage),
      convertToPublicUrl(ebook.fileUrl)
    ]);
    
    const ebookWithPublicUrls = {
      ...ebook,
      coverImage: coverImageUrl,
      fileUrl: fileUrl
    };
    
    return res.json(ebookWithPublicUrls);
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

    // Extract the S3 key from the file URL if it's a full URL
    let fileKey = ebook.fileUrl;
    if (fileKey.startsWith('http')) {
      const url = new URL(fileKey);
      fileKey = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    }

    // Generate the public URL
    const publicUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${encodeURIComponent(fileKey)}`;
    
    // Return the public URL for download
    return res.json({ 
      downloadUrl: publicUrl,
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
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    // Check if user is admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { title, subtitle, description, author, category, pages, language, coverImage, fileUrl, fileSize } = req.body;
    
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
        fileUrl: fileUrl || '/uploads/sample.pdf',
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
    
    // Check for Prisma validation errors
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Check for Prisma known errors
      if (error.message.includes('prisma')) {
        return res.status(500).json({ 
          error: 'Database error',
          details: error.message,
          code: error.name
        });
      }
      
      // Check for validation errors
      if (error.message.includes('missing') || error.message.includes('required')) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.message
        });
      }
    }
    
    // Default error response
    return res.status(500).json({ 
      error: 'Failed to create e-book',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Update e-book - TEMPORARILY DISABLED
// router.put('/admin/ebooks/:id', authenticate, uploadToS3('digital-library').fields([
//   { name: 'coverImage', maxCount: 1 },
//   { name: 'file', maxCount: 1 }
// ]), async (req, res) => {
//   try {
//     const userId = (req.user as any)?.id;
//     const { id } = req.params;
//     }
//     // If file is being updated, delete old PDF from S3
//     if (files.file?.[0]) {
//       const existingEbook = await prisma.eBook.findUnique({ where: { id } });
//       if (existingEbook && existingEbook.fileUrl && existingEbook.fileUrl !== files.file[0].location) {
//         try {
//           await deleteFromS3(existingEbook.fileUrl);
//         } catch (s3Error) {
//           console.error('S3 delete error:', s3Error);
//         }
//       }
//       updateData.fileUrl = files.file[0].location;
//       updateData.fileSize = `${(files.file[0].size / (1024 * 1024)).toFixed(1)} MB`;
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
    // if (existingEbook.fileUrl) {
    //   try {
    //     await deleteFromS3(existingEbook.fileUrl);
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

    // Convert all URLs to pre-signed URLs with long expiration
    const ebooksWithPublicUrls = await Promise.all(ebooks.map(async (ebook) => ({
      ...ebook,
      coverImage: await convertToPublicUrl(ebook.coverImage),
      fileUrl: await convertToPublicUrl(ebook.fileUrl)
    })));

    return res.json(ebooksWithPublicUrls);
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
        fileUrl: '/uploads/upsc-complete-guide.pdf',
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
        fileUrl: '/uploads/indian-polity.pdf',
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
        fileUrl: '/uploads/indian-economy.pdf',
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
        fileUrl: '/uploads/geography-india-world.pdf',
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
        fileUrl: '/uploads/bpsc-strategy.pdf',
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
        fileUrl: '/uploads/uppcs-study-material.pdf',
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


interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
  error?: {
    message: string;
    code: string;
  };
}

// Function to validate Gemini API key
const validateGeminiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured');
  }
  return apiKey;
};

// Mock test generation route
router.post('/mock-test/generate', authenticate, checkSubscription, async (req, res) => {
  try {
    const apiKey = validateGeminiKey();
    const { subject, difficulty, questionCount } = req.body;

    // Validate input
    if (!subject || !difficulty || !questionCount) {
      console.log('Missing parameters:', { subject, difficulty, questionCount });
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Call Gemini API to generate questions
    const prompt = `Generate ${questionCount} multiple choice questions for UPSC exam preparation on the subject of ${subject} at ${difficulty} difficulty level. Each question should have 4 options and one correct answer. Format the response as a JSON array of objects with the following structure:
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0 // Index of the correct option (0-3)
    }
    Make sure to return ONLY the JSON array without any additional text or formatting.`;

    console.log('Sending request to Gemini with subject:', subject, 'difficulty:', difficulty);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048
        }
      })
    });

    const data = await response.json() as GeminiResponse;
    console.log('Gemini API Response:', data);
    
    if (!response.ok || data.error) {
      console.error('Gemini API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: data.error
      });
      return res.status(500).json({ 
        error: 'Failed to generate questions',
        details: data.error?.message || 'Unknown error occurred'
      });
    }

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid Gemini response format:', data);
      return res.status(500).json({ error: 'Invalid response from AI service' });
    }

    // Parse and format the response
    let questions;
    try {
      const responseText = data.candidates[0].content.parts[0].text;
      console.log('Raw AI response text:', responseText);
      
      // Try to extract JSON if it's wrapped in other text
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      
      console.log('Extracted JSON string:', jsonStr);
      
      try {
        questions = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        // Try to fix common JSON issues
        const fixedJson = jsonStr
          .replace(/([\{\[]\s*[\w\d]+\.?[\w\d]*\s*:)/g, (match) => {
            // Add quotes around unquoted property names
            return match.replace(/([\w\d\.]+)/g, '"$1"');
          })
          .replace(/'/g, '"') // Replace single quotes with double quotes
          .replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas
          
        console.log('Attempting to parse fixed JSON:', fixedJson);
        questions = JSON.parse(fixedJson);
      }
      
      if (!Array.isArray(questions)) {
        console.error('Questions is not an array:', questions);
        return res.status(500).json({ 
          error: 'Invalid questions format from AI service',
          details: 'Expected an array of questions',
          received: typeof questions
        });
      }

      // Validate question format
      const invalidQuestions = questions.filter((q, i) => {
        const isValid = q && 
                       q.question && 
                       Array.isArray(q.options) && 
                       q.options.length === 4 && 
                       typeof q.correctAnswer === 'number' &&
                       q.correctAnswer >= 0 && 
                       q.correctAnswer <= 3;
        
        if (!isValid) {
          console.error(`Invalid question at index ${i}:`, q);
        }
        return !isValid;
      });

      if (invalidQuestions.length > 0) {
        console.error('Invalid question format in questions:', invalidQuestions);
        return res.status(500).json({ 
          error: 'Invalid question format from AI service',
          details: `Found ${invalidQuestions.length} invalid questions`,
          firstInvalidQuestion: invalidQuestions[0]
        });
      }
    } catch (parseError) {
      console.error('Failed to parse questions:', {
        error: parseError,
        content: data.candidates[0].content.parts[0].text
      });
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }
    
    // Get the authenticated user's ID from the decoded JWT
    const userId = (req as any)?.user?.userId || (req as any)?.user?.id;
    
    if (!userId) {
      console.error('User ID not found in request. Available user data:', (req as any)?.user);
      return res.status(401).json({ 
        error: 'User not authenticated',
        details: 'User ID not found in request',
        availableUserData: (req as any)?.user
      });
    }
    
    // Create mock test and questions in a transaction with increased timeout
    const transactionOptions = {
      maxWait: 30000, // 30 seconds max wait time
      timeout: 120000, // 2 minutes max transaction duration
      isolationLevel: 'Serializable' as const
    };

    const mockTest = await prisma.$transaction(async (tx) => {
      // First create the mock test
      const createdTest = await tx.$queryRaw`
        INSERT INTO mock_tests (id, subject, difficulty, "userId", "expiresAt", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${subject}, ${difficulty}, ${userId}, 
                ${new Date(Date.now() + 24 * 60 * 60 * 1000)}::timestamp, 
                NOW(), NOW())
        RETURNING *;
      ` as Array<{ id: string }>;
      
      if (!createdTest?.[0]?.id) {
        throw new Error('Failed to create mock test');
      }
      
      const testId = createdTest[0].id;

      // Create questions if they exist
      if (questions?.length) {
        // Use a batch insert approach with prepared statements for better performance
        const batchSize = 10; // Process questions in batches of 10
        
        for (let i = 0; i < questions.length; i += batchSize) {
          const batch = questions.slice(i, i + batchSize);
          const values = batch.map((q, idx) => {
            const optionsArray = q.options.map((opt: string) => opt.replace(/"/g, '\\"'));
            return {
              testId,
              question: q.question,
              options: optionsArray,
              correctAnswer: q.correctAnswer,
              questionNumber: i + idx + 1
            };
          });

          // Convert options array to PostgreSQL array literal format
          const valuesWithFormattedOptions = values.map(v => ({
            ...v,
            optionsLiteral: `{${v.options.map((opt: string) => `"${opt}"`).join(',')}}`
          }));
          
          // Use a prepared statement for the batch
          await tx.$executeRaw`
            WITH batch_data AS (
              SELECT 
                gen_random_uuid() as id,
                (q.value->>'testId')::uuid as test_id,
                q.value->>'question' as question_text,
                (q.value->>'optionsLiteral')::text[] as options,
                (q.value->>'correctAnswer')::integer as correct_answer,
                (q.value->>'questionNumber')::integer as question_number,
                NOW() as created_at,
                NOW() as updated_at
              FROM jsonb_array_elements(${JSON.stringify(valuesWithFormattedOptions)}::jsonb) AS q(value)
            )
            INSERT INTO mock_test_questions 
              (id, "testId", "questionText", options, "correctAnswer", "questionNumber", "createdAt", "updatedAt")
            SELECT 
              id, 
              test_id, 
              question_text, 
              options, 
              correct_answer, 
              question_number,
              created_at,
              updated_at
            FROM batch_data
          `;
        }
      }

      // Fetch the complete test with questions
      const testWithQuestions = await tx.$queryRaw`
        SELECT 
          mt.*,
          (
            SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'id', mtq.id,
                'question', mtq."questionText",
                'options', mtq.options,
                'selectedAnswer', NULL
              )
              ORDER BY mtq."questionNumber"
            ), '[]'::jsonb)
            FROM mock_test_questions mtq
            WHERE mtq."testId" = mt.id
          ) as questions
        FROM mock_tests mt
        WHERE mt.id = ${testId};
      ` as Array<any>;

      if (!testWithQuestions?.[0]) {
        throw new Error('Failed to fetch created mock test');
      }

      return testWithQuestions[0];
    }, transactionOptions);

    console.log('Successfully generated and stored mock test with ID:', mockTest.id);
    
    return res.json({ 
      testId: mockTest.id,
      questions: mockTest.questions
    });
  } catch (error) {
    console.error('Error generating mock test:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate mock test';
    return res.status(500).json({ error: message });
  }
});
interface Answer {
  questionId: string;
  selectedAnswer: string | number;
}

interface QuestionResult {
  questionId: string;
  questionNumber: number;
  isCorrect: boolean;
  selectedAnswer: string | number;
  correctAnswer: number; // Index of correct answer
  options: string[];
}

interface EvaluationRequest {
  testId: string;
  answers: Answer[];
}

interface EvaluationResult {
  success: boolean;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  skipped: number;
  questionResults: QuestionResult[];
  analysis?: string;
  error?: string;
}

// Admin-only endpoint to delete an e-book
router.delete('/ebooks/:id', authenticate, async (req, res) => {
  let ebook;
  try {
    console.log('Delete e-book request received:', req.params);
    const { id } = req.params;
    const userId = (req as any)?.user?.userId;
    
    if (!userId) {
      console.error('No user ID found in request');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true }
    });
    
    if (!user) {
      console.error('User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.isAdmin) {
      console.error('Non-admin user attempted to delete e-book:', userId);
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Find the e-book to get file URLs for cleanup
    ebook = await prisma.eBook.findUnique({
      where: { id },
      select: { 
        id: true, 
        title: true, 
        coverImage: true, 
        fileUrl: true 
      }
    });
    
    if (!ebook) {
      console.error('E-book not found:', id);
      return res.status(404).json({ error: 'E-book not found' });
    }
    
    console.log('Deleting e-book:', { id: ebook.id, title: ebook.title });
    
    // Delete the e-book record
    await prisma.eBook.delete({
      where: { id }
    });
    
    console.log('Successfully deleted e-book from database:', id);
    
    // Delete files from S3
    try {
      const { deleteFromS3 } = require('../utils/s3');
      
      // Delete cover image if it exists
      if (ebook.coverImage) {
        console.log('Deleting cover image from S3:', ebook.coverImage);
        await deleteFromS3(ebook.coverImage).catch((error: Error) => 
          console.error('Error deleting cover image from S3:', error)
        );
      }
      
      // Delete PDF file if it exists
      if (ebook.fileUrl) {
        console.log('Deleting PDF file from S3:', ebook.fileUrl);
        await deleteFromS3(ebook.fileUrl).catch((error: any) => 
          console.error('Error deleting PDF file from S3:', error)
        );
      }
      
      console.log('Successfully deleted all files from S3 for e-book:', id);
    } catch (s3Error) {
      console.error('Error deleting files from S3:', s3Error);
      // Continue with the response even if S3 deletion fails
    }
    
    return res.json({ 
      success: true, 
      message: 'E-book and associated files deleted successfully',
      deletedEbook: { id: ebook.id, title: ebook.title }
    });
  } catch (error) {
    console.error('Error deleting e-book:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return res.status(500).json({ 
      error: 'Failed to delete e-book',
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      partialData: ebook ? { id: ebook.id, title: ebook.title } : undefined
    });
  }
});

// Verify Gemini API key configuration
router.get('/mock-test/verify-api', authenticate, async (_req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'GEMINI_API_KEY is not configured in environment variables'
      });
    }

    // Test the API key with a simple request
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "Test message to verify API key"
            }]
          }]
        })
      }
    );

    const data = await response.json() as GeminiResponse;
    
    if (!response.ok) {
      console.error('Gemini API key verification failed:', data);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify Gemini API key',
        details: data.error?.message || 'Unknown error occurred'
      });
    }

    return res.json({
      success: true,
      message: 'Gemini API key is valid and working'
    });
  } catch (error) {
    console.error('Error verifying Gemini API key:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify Gemini API key',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Endpoint to get a pre-signed URL for a PDF
router.get('/pdf', authenticate, async (req, res) => {
  try {
    const { key } = req.query;
    
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid key parameter' });
    }
    
    try {
      // Get a pre-signed URL for the PDF with forced download
      const fileUrl = await getPublicUrl(key);
      
      // Redirect to the pre-signed URL
      return res.redirect(fileUrl);
    } catch (error) {
      console.error('Error generating pre-signed URL for PDF:', error);
      return res.status(500).json({ 
        error: 'Failed to generate PDF URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error in PDF endpoint:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Endpoint to get a pre-signed URL for an image
router.get('/image', async (req, res) => {
  try {
    const { key } = req.query;
    
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid key parameter' });
    }
    
    try {
      // Get a pre-signed URL for the image
      const imageUrl = await getPublicUrl(key);
      
      // Redirect to the pre-signed URL
      return res.redirect(imageUrl);
    } catch (error) {
      console.error('Error generating pre-signed URL:', error);
      return res.status(500).json({ 
        error: 'Failed to generate image URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error in image endpoint:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Clean up old mock tests (older than 7 days)
async function cleanupOldMockTests() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const formattedDate = sevenDaysAgo.toISOString();
    
    // Use a transaction to delete old tests and their questions
    await prisma.$transaction(async (tx) => {
      const prismaTx = tx as any;
      
      // Delete questions first due to foreign key constraints
      await prismaTx.mockTestQuestion.deleteMany({
        where: {
          test: {
            createdAt: {
              lt: formattedDate
            }
          }
        }
      });
      
      // Then delete the tests
      await prismaTx.mockTest.deleteMany({
        where: {
          createdAt: {
            lt: formattedDate
          }
        }
      });
    });
    
    console.log('Cleanup job completed');
  } catch (error) {
    console.error('Error cleaning up old mock tests:', error);
  }
}

// Run cleanup every 24 hours
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
setInterval(cleanupOldMockTests, CLEANUP_INTERVAL_MS);

// Run initial cleanup on startup
cleanupOldMockTests().catch(console.error);

// Mock test evaluation route
router.post('/mock-test/evaluate', authenticate, checkSubscription, async (req: any, res: any) => {
  try {
    const { testId, answers } = req.body as EvaluationRequest;
    const userId = req.user?.userId;

    // Validate input
    if (!testId || !Array.isArray(answers)) {
      console.log('Invalid parameters:', { testId, answers });
      return res.status(400).json({ 
        success: false,
        error: 'Missing or invalid required parameters: testId and answers array are required' 
      });
    }

    // Start a transaction for data consistency
    return await prisma.$transaction(async (tx) => {
      // First get the test using Prisma's built-in methods
      const testData = await tx.mockTest.findUnique({
        where: { id: testId },
        include: {
          questions: {
            orderBy: { questionNumber: 'asc' }
          }
        }
      });
      
      if (!testData) {
        console.log('Test not found:', { testId, userId });
        return res.status(404).json({ 
          success: false,
          error: 'Test not found'
        });
      }
      
      // Get the questions from the included relation
      const questions = testData.questions || [];
      
      // Remove the questions from testData to match the expected type
      const { questions: _, ...testWithoutQuestions } = testData;
      
      // Combine test with questions
      const test = {
        ...testWithoutQuestions,
        questions: questions
      } as MockTest & { questions: MockTestQuestion[] };

      // Check if test has expired
      if (test.expiresAt && new Date() > new Date(test.expiresAt)) {
        return res.status(400).json({ 
          success: false, 
          error: 'This test has expired',
          details: `Test expired on ${test.expiresAt}`
        });
      }

      // Verify test ownership
      const currentUserId = (req as any)?.user?.userId || (req as any)?.user?.id;
      if (test.userId !== currentUserId) {
        console.error('Unauthorized access attempt:', { 
          testUserId: test.userId, 
          currentUserId,
          user: (req as any)?.user 
        });
        return res.status(403).json({ 
          success: false, 
          error: 'Unauthorized access to this test',
          details: 'Test does not belong to the current user',
          testUserId: test.userId,
          currentUserId
        });
      }

      // Type for question with answers
      interface QuestionWithAnswers {
        id: string;
        questionNumber: number;
        correctAnswer: number;
        options: string[];
        testId: string;
      }

      // Validate questions data
      if (!test.questions || !Array.isArray(test.questions) || test.questions.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: 'No questions found for this test',
          testId: test.id
        });
      }

      // Create a map of question IDs to questions for quick lookup
      const questionMap = new Map<string, QuestionWithAnswers>();
      for (const q of test.questions) {
        if (q && q.id && q.testId === testId) {
          questionMap.set(q.id, q as QuestionWithAnswers);
        }
      }

      // Validate all answers reference existing questions
      const invalidQuestions = answers.filter(a => !questionMap.has(a.questionId));
      if (invalidQuestions.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'One or more questions not found in this test',
          invalidQuestionIds: invalidQuestions.map(q => q.questionId),
          testId: test.id,
          validQuestionIds: Array.from(questionMap.keys())
        });
      }

      // Evaluate each answer
      let correctCount = 0;
      const questionResults: QuestionResult[] = [];
      
      for (const answer of answers) {
        const question = questionMap.get(answer.questionId);
        if (!question) continue;
        
        // Ensure selectedAnswer is a number for comparison
        const selectedAnswer = typeof answer.selectedAnswer === 'string' 
          ? parseInt(answer.selectedAnswer, 10) 
          : answer.selectedAnswer;
          
        const isCorrect = question.correctAnswer === selectedAnswer;
        if (isCorrect) correctCount++;
        
        questionResults.push({
          questionId: question.id,
          questionNumber: question.questionNumber,
          isCorrect,
          selectedAnswer,
          correctAnswer: question.correctAnswer,
          options: question.options
        });
      }

      // Calculate score and metrics
      const totalQuestions = test.questions?.length ?? 0;
      const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
      const incorrectCount = answers.length - correctCount;
      const skippedCount = Math.max(0, totalQuestions - answers.length);

      // Prepare initial result
      const result: EvaluationResult = {
        success: true,
        score,
        totalQuestions,
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        skipped: skippedCount,
        questionResults,
        analysis: ''
      };

      console.log(`Test evaluation completed: ${score}% (${correctCount}/${totalQuestions} correct)`);
      
      // Generate analysis using Gemini if API key is available
      if (process.env.GEMINI_API_KEY) {
        try {
          const apiKey = validateGeminiKey();
          
          // Create a detailed prompt with question analysis
          const questionAnalysis = questionResults.map((result, i) => 
            `Question ${i + 1}: ${result.isCorrect ? '✓' : '✗'}`
          ).join('\n');

          const prompt = `As an UPSC exam expert, analyze this test performance and provide structured feedback:

Test Results:
- Total Questions: ${result.totalQuestions}
- Correct Answers: ${result.correctAnswers}
- Incorrect Answers: ${result.incorrectAnswers}
- Score: ${result.score}%

Questions Analysis:
${questionAnalysis}

Please provide:
1. Performance summary (1-2 sentences)
2. Key strengths (2-3 bullet points)
3. Areas for improvement (2-3 bullet points)
4. Study recommendations (2-3 specific suggestions)

Keep the response concise and actionable.`;

          console.log('Sending request to Gemini API...');
          
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.7,
                  topK: 40,
                  topP: 0.95,
                  maxOutputTokens: 1024
                }
              })
            }
          );

          if (!response.ok) {
            throw new Error(`Gemini API responded with status ${response.status}`);
          }

          const data = await response.json() as GeminiResponse;
          
          // Add the analysis to the result
          result.analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 
            'Analysis not available. Please review your answers and try again.';
          
        } catch (error) {
          console.error('Error generating analysis with Gemini:', error);
          // Continue with the result even if analysis fails
          result.analysis = 'Performance analysis could not be generated at this time.';
        }
      }
    
      // Return the evaluation result
      return res.json(result);
    }, {
      // Transaction options
      maxWait: 10000, // 10 seconds
      timeout: 30000, // 30 seconds
      isolationLevel: 'ReadCommitted'
    });
  } catch (error) {
    console.error('Error evaluating mock test:', error);
    // Check for specific error types to provide better error messages
    if (error.code === 'P2025') { // Prisma not found error code
      return res.status(404).json({ 
        success: false, 
        error: 'Test not found or access denied',
        details: error.meta?.cause || 'The requested test could not be found'
      });
    } else if (error.code === 'P2023') { // Invalid UUID format
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid test ID format',
        details: 'The provided test ID is not in the correct format'
      });
    }
    
    // Generic error response
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to evaluate test',
      details: error instanceof Error ? error.message : 'An unknown error occurred',
      ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {})
    });
  }
});

export default router; 