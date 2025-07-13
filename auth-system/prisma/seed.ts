import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.course.deleteMany(); // Clear existing courses
  await prisma.eBook.deleteMany(); // Clear existing e-books

  // Make 8178785849 an admin
  const adminMobile = '8178785849';
  const adminName = 'Admin User';
  const existingAdmin = await prisma.user.findUnique({ where: { mobileNumber: adminMobile } });
  if (existingAdmin) {
    await prisma.user.update({ where: { mobileNumber: adminMobile }, data: { isAdmin: true } });
  } else {
    await prisma.user.create({ data: { name: adminName, mobileNumber: adminMobile, isVerified: true, isAdmin: true } });
  }

  await prisma.course.createMany({
    data: [
      {
        title: "KARAMSHILA GS FOUNDATION COURSE",
        subtitle: "UPSC CSE Foundation 2026",
        image: "/karam.png",
        startDate: "21 July",
        features: [
          "Available in Online Mode",
          "15 Months Validity",
          "800+ Hours of Classes",
          "Test Series, CSAT & Monthly Magazines"
        ],
        price: 19999,
        originalPrice: 34999,
        discount: 43,
      },
      {
        title: "GYANSHILA DRONA UPPCS FOUNDATION COURSE",
        subtitle: "UPPCS Foundation 2026",
        image: "/31.png",
        startDate: "21 July",
        features: [
          "Available in Online Mode",
          "12 Months Validity",
          "Pre+Mains Live & Recorded",
          "Test Series, CSAT & Monthly Magazines"
        ],
        price: 9999,
        originalPrice: 19999,
        discount: 50,
      },
      {
        title: "DHRUVSHILA KAUTILYA BPSC FOUNDATION COURSE",
        subtitle: "BPSC Foundation 2026",
        image: "/32.png",
        startDate: "21 July",
        features: [
          "Available in Online Mode",
          "12 Months Validity",
          "Pre+Mains Live & Recorded",
          "Test Series, CSAT & Monthly Magazines"
        ],
        price: 7999,
        originalPrice: 19999,
        discount: 60,
      },
      {
        title: "AADHARSHILA NCERT CONCEPT COURSE",
        subtitle: "UPSC CSE Foundation 2026",
        image: "/29.png",
        startDate: "21 July",
        features: [
          "Available in Online Mode",
          "6 Months Validity",
          "Comprehensive Syllabus Coverage",
          "Dedicated Doubt & Revisions Session"
        ],
        price: 9999,
        originalPrice: 19999,
        discount: 50,
      },
      {
        title: "UPPCS TEST SERIES",
        subtitle: "Preparation Booster Test Series for Batch 2025",
        image: "/UPPCS TEST DERIES.png",
        startDate: "21 July",
        features: [
          "Available in Online Mode",
          "15 Tests Included",
          "Validity Till Prelims Exam*",
          "360° Approach with Modal Answers"
        ],
        price: 1999,
        originalPrice: 6999,
        discount: 71,
      },
      {
        title: "BPSC TEST SERIES",
        subtitle: "Preparation Booster Test Series for Batch 2025",
        image: "/BPSC TEST SERIES.png",
        startDate: "21 July",
        features: [
          "Available in Online Mode",
          "15 Tests Included",
          "Validity Till Prelims Exam*",
          "360° Approach with Modal Answers"
        ],
        price: 1499,
        originalPrice: 4999,
        discount: 70,
      }
    ]
  });

  // Add sample e-books
  await prisma.eBook.createMany({
    data: [
      {
        title: "UPSC Civil Services Examination Guide 2025",
        subtitle: "Complete Preparation Strategy and Syllabus Coverage",
        description: "A comprehensive guide covering the complete UPSC Civil Services Examination syllabus, preparation strategies, and expert tips for success.",
        author: "Maheshan IAS Academy",
        category: "UPSC",
        coverImage: "/uploads/digital-library/upsc-guide-2025.jpg",
        pdfUrl: "/uploads/digital-library/upsc-guide-2025.pdf",
        fileSize: "2.5 MB",
        pages: 450,
        language: "English",
        isActive: true
      },
      {
        title: "BPSC Examination Pattern & Strategy",
        subtitle: "Bihar Public Service Commission Complete Guide",
        description: "Detailed analysis of BPSC examination pattern, previous year questions, and strategic preparation approach for Bihar PCS.",
        author: "Maheshan IAS Academy",
        category: "BPSC",
        coverImage: "/uploads/digital-library/bpsc-guide.jpg",
        pdfUrl: "/uploads/digital-library/bpsc-guide.pdf",
        fileSize: "1.8 MB",
        pages: 320,
        language: "English",
        isActive: true
      },
      {
        title: "UPPCS Prelims & Mains Strategy",
        subtitle: "Uttar Pradesh Public Service Commission Preparation",
        description: "Complete strategy guide for UPPCS examination including prelims and mains preparation techniques.",
        author: "Maheshan IAS Academy",
        category: "UPPCS",
        coverImage: "/uploads/digital-library/uppcs-guide.jpg",
        pdfUrl: "/uploads/digital-library/uppcs-guide.pdf",
        fileSize: "2.1 MB",
        pages: 380,
        language: "English",
        isActive: true
      },
      {
        title: "Indian Polity & Constitution",
        subtitle: "Complete Study Material for Civil Services",
        description: "Comprehensive study material covering Indian Polity, Constitution, and Governance topics for civil services examination.",
        author: "Maheshan IAS Academy",
        category: "General Studies",
        coverImage: "/uploads/digital-library/indian-polity.jpg",
        pdfUrl: "/uploads/digital-library/indian-polity.pdf",
        fileSize: "3.2 MB",
        pages: 520,
        language: "English",
        isActive: true
      },
      {
        title: "Indian Economy: Concepts & Current Affairs",
        subtitle: "Economic Survey and Budget Analysis",
        description: "Complete coverage of Indian Economy including Economic Survey, Union Budget, and current economic developments.",
        author: "Maheshan IAS Academy",
        category: "General Studies",
        coverImage: "/uploads/digital-library/indian-economy.jpg",
        pdfUrl: "/uploads/digital-library/indian-economy.pdf",
        fileSize: "2.8 MB",
        pages: 480,
        language: "English",
        isActive: true
      },
      {
        title: "Geography of India & World",
        subtitle: "Physical, Human, and Economic Geography",
        description: "Comprehensive geography study material covering physical, human, and economic geography of India and the world.",
        author: "Maheshan IAS Academy",
        category: "General Studies",
        coverImage: "/uploads/digital-library/geography.jpg",
        pdfUrl: "/uploads/digital-library/geography.pdf",
        fileSize: "2.9 MB",
        pages: 420,
        language: "English",
        isActive: true
      },
      {
        title: "History of India: Ancient to Modern",
        subtitle: "Complete Historical Timeline and Analysis",
        description: "Detailed study material covering the complete history of India from ancient times to modern era.",
        author: "Maheshan IAS Academy",
        category: "General Studies",
        coverImage: "/uploads/digital-library/indian-history.jpg",
        pdfUrl: "/uploads/digital-library/indian-history.pdf",
        fileSize: "3.5 MB",
        pages: 580,
        language: "English",
        isActive: true
      },
      {
        title: "Environment & Ecology",
        subtitle: "Environmental Studies for Civil Services",
        description: "Comprehensive coverage of environment and ecology topics including biodiversity, climate change, and environmental policies.",
        author: "Maheshan IAS Academy",
        category: "General Studies",
        coverImage: "/uploads/digital-library/environment.jpg",
        pdfUrl: "/uploads/digital-library/environment.pdf",
        fileSize: "2.2 MB",
        pages: 350,
        language: "English",
        isActive: true
      },
      {
        title: "Public Administration Optional",
        subtitle: "Complete Study Material for Optional Paper",
        description: "Comprehensive study material for Public Administration optional subject including theories, concepts, and case studies.",
        author: "Maheshan IAS Academy",
        category: "Optional Subjects",
        coverImage: "/uploads/digital-library/public-administration.jpg",
        pdfUrl: "/uploads/digital-library/public-administration.pdf",
        fileSize: "4.1 MB",
        pages: 650,
        language: "English",
        isActive: true
      },
      {
        title: "Sociology Optional Guide",
        subtitle: "Sociological Theories and Indian Society",
        description: "Complete guide for Sociology optional including sociological theories, Indian society, and social issues.",
        author: "Maheshan IAS Academy",
        category: "Optional Subjects",
        coverImage: "/uploads/digital-library/sociology.jpg",
        pdfUrl: "/uploads/digital-library/sociology.pdf",
        fileSize: "3.8 MB",
        pages: 580,
        language: "English",
        isActive: true
      },
      {
        title: "Current Affairs Monthly Magazine - January 2025",
        subtitle: "Comprehensive Coverage of National & International Events",
        description: "Monthly current affairs magazine covering important national and international events, government schemes, and policy updates.",
        author: "Maheshan IAS Academy",
        category: "Current Affairs",
        coverImage: "/uploads/digital-library/current-affairs-jan-2025.jpg",
        pdfUrl: "/uploads/digital-library/current-affairs-jan-2025.pdf",
        fileSize: "1.5 MB",
        pages: 120,
        language: "English",
        isActive: true
      },
      {
        title: "UPSC Previous Year Papers (2015-2024)",
        subtitle: "Solved Papers with Detailed Explanations",
        description: "Collection of UPSC previous year question papers from 2015 to 2024 with detailed solutions and explanations.",
        author: "Maheshan IAS Academy",
        category: "Previous Year Papers",
        coverImage: "/uploads/digital-library/upsc-previous-papers.jpg",
        pdfUrl: "/uploads/digital-library/upsc-previous-papers.pdf",
        fileSize: "5.2 MB",
        pages: 850,
        language: "English",
        isActive: true
      },
      {
        title: "BPSC Previous Year Papers (2018-2024)",
        subtitle: "Solved Papers with Expert Analysis",
        description: "Collection of BPSC previous year question papers with detailed solutions and expert analysis for better understanding.",
        author: "Maheshan IAS Academy",
        category: "Previous Year Papers",
        coverImage: "/uploads/digital-library/bpsc-previous-papers.jpg",
        pdfUrl: "/uploads/digital-library/bpsc-previous-papers.pdf",
        fileSize: "3.8 MB",
        pages: 620,
        language: "English",
        isActive: true
      },
      // Mock Tests
      {
        title: "UPSC Prelims Mock Test Series - Set 1",
        subtitle: "Complete Mock Test with Solutions",
        description: "Full-length UPSC Prelims mock test with 100 questions covering all subjects. Includes detailed solutions and explanations.",
        author: "Maheshan IAS Academy",
        category: "Mock Tests",
        coverImage: "/uploads/digital-library/upsc-mock-test-1.jpg",
        pdfUrl: "/uploads/digital-library/upsc-mock-test-1.pdf",
        fileSize: "2.8 MB",
        pages: 180,
        language: "English",
        isActive: true
      },
      {
        title: "UPSC Prelims Mock Test Series - Set 2",
        subtitle: "Advanced Level Practice Test",
        description: "Advanced level UPSC Prelims mock test designed to challenge aspirants and improve their problem-solving skills.",
        author: "Maheshan IAS Academy",
        category: "Mock Tests",
        coverImage: "/uploads/digital-library/upsc-mock-test-2.jpg",
        pdfUrl: "/uploads/digital-library/upsc-mock-test-2.pdf",
        fileSize: "3.1 MB",
        pages: 200,
        language: "English",
        isActive: true
      },
      {
        title: "BPSC Prelims Mock Test - Complete Set",
        subtitle: "Bihar PCS Specific Practice Tests",
        description: "Comprehensive BPSC Prelims mock tests with questions specifically designed for Bihar Public Service Commission examination.",
        author: "Maheshan IAS Academy",
        category: "Mock Tests",
        coverImage: "/uploads/digital-library/bpsc-mock-test.jpg",
        pdfUrl: "/uploads/digital-library/bpsc-mock-test.pdf",
        fileSize: "2.5 MB",
        pages: 160,
        language: "English",
        isActive: true
      },
      {
        title: "UPPCS Mock Test Series - Prelims & Mains",
        subtitle: "Complete Practice Material",
        description: "Full mock test series for UPPCS including both prelims and mains papers with detailed solutions.",
        author: "Maheshan IAS Academy",
        category: "Mock Tests",
        coverImage: "/uploads/digital-library/uppcs-mock-test.jpg",
        pdfUrl: "/uploads/digital-library/uppcs-mock-test.pdf",
        fileSize: "3.3 MB",
        pages: 220,
        language: "English",
        isActive: true
      },
      {
        title: "CSAT Mock Test Series",
        subtitle: "Civil Services Aptitude Test Practice",
        description: "Specialized mock tests for CSAT paper focusing on reasoning, comprehension, and decision-making skills.",
        author: "Maheshan IAS Academy",
        category: "Mock Tests",
        coverImage: "/uploads/digital-library/csat-mock-test.jpg",
        pdfUrl: "/uploads/digital-library/csat-mock-test.pdf",
        fileSize: "2.2 MB",
        pages: 140,
        language: "English",
        isActive: true
      },
      // PYQ (Previous Year Questions) - Detailed
      {
        title: "UPSC PYQ Analysis - General Studies Paper 1 (2020-2024)",
        subtitle: "Topic-wise Previous Year Questions",
        description: "Detailed analysis of UPSC General Studies Paper 1 questions from 2020 to 2024 with topic-wise categorization.",
        author: "Maheshan IAS Academy",
        category: "PYQ Analysis",
        coverImage: "/uploads/digital-library/upsc-pyq-gs1.jpg",
        pdfUrl: "/uploads/digital-library/upsc-pyq-gs1.pdf",
        fileSize: "4.5 MB",
        pages: 320,
        language: "English",
        isActive: true
      },
      {
        title: "UPSC PYQ Analysis - General Studies Paper 2 (2020-2024)",
        subtitle: "CSAT Previous Year Questions",
        description: "Comprehensive analysis of UPSC CSAT questions with detailed explanations and strategy tips.",
        author: "Maheshan IAS Academy",
        category: "PYQ Analysis",
        coverImage: "/uploads/digital-library/upsc-pyq-gs2.jpg",
        pdfUrl: "/uploads/digital-library/upsc-pyq-gs2.pdf",
        fileSize: "3.8 MB",
        pages: 280,
        language: "English",
        isActive: true
      },
      {
        title: "BPSC PYQ Analysis - Complete Set (2018-2024)",
        subtitle: "Bihar PCS Previous Year Questions",
        description: "Complete analysis of BPSC previous year questions with detailed solutions and topic-wise breakdown.",
        author: "Maheshan IAS Academy",
        category: "PYQ Analysis",
        coverImage: "/uploads/digital-library/bpsc-pyq.jpg",
        pdfUrl: "/uploads/digital-library/bpsc-pyq.pdf",
        fileSize: "4.2 MB",
        pages: 350,
        language: "English",
        isActive: true
      },
      {
        title: "UPPCS PYQ Analysis - Prelims & Mains",
        subtitle: "UP PCS Previous Year Questions",
        description: "Detailed analysis of UPPCS previous year questions for both prelims and mains examinations.",
        author: "Maheshan IAS Academy",
        category: "PYQ Analysis",
        coverImage: "/uploads/digital-library/uppcs-pyq.jpg",
        pdfUrl: "/uploads/digital-library/uppcs-pyq.pdf",
        fileSize: "3.9 MB",
        pages: 310,
        language: "English",
        isActive: true
      },
      {
        title: "Topic-wise PYQ Compilation - Indian Polity",
        subtitle: "Previous Year Questions on Indian Constitution",
        description: "Comprehensive collection of previous year questions on Indian Polity and Constitution from all major civil service examinations.",
        author: "Maheshan IAS Academy",
        category: "PYQ Analysis",
        coverImage: "/uploads/digital-library/pyq-polity.jpg",
        pdfUrl: "/uploads/digital-library/pyq-polity.pdf",
        fileSize: "2.8 MB",
        pages: 240,
        language: "English",
        isActive: true
      },
      {
        title: "Topic-wise PYQ Compilation - Indian Economy",
        subtitle: "Previous Year Questions on Economic Topics",
        description: "Topic-wise compilation of previous year questions on Indian Economy from UPSC, BPSC, and UPPCS examinations.",
        author: "Maheshan IAS Academy",
        category: "PYQ Analysis",
        coverImage: "/uploads/digital-library/pyq-economy.jpg",
        pdfUrl: "/uploads/digital-library/pyq-economy.pdf",
        fileSize: "3.1 MB",
        pages: 260,
        language: "English",
        isActive: true
      }
    ]
  });

  console.log('Courses and E-books seeded! Admin user set.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 