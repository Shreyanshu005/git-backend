import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Check if e-books already exist
  const existingEbooks = await prisma.eBook.count();
  if (existingEbooks > 0) {
    console.log(`📚 ${existingEbooks} e-books already exist, skipping seed...`);
    return;
  }

  // Sample e-books data
  const sampleEbooks = [
      {
      title: 'UPSC CSE Complete Guide 2024',
      subtitle: 'Comprehensive preparation strategy and study materials',
      description: 'A complete guide covering all aspects of UPSC Civil Services Examination including prelims, mains, and interview preparation. This comprehensive resource includes detailed syllabus coverage, previous year questions analysis, and strategic preparation tips.',
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
      description: 'Comprehensive coverage of Indian Constitution, political system, and governance structures. Includes detailed analysis of constitutional provisions, parliamentary procedures, and current political developments.',
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
      description: 'Detailed analysis of Indian economy, economic policies, and current economic developments. Covers fundamental economic concepts, government schemes, and recent economic trends.',
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
      description: 'Comprehensive coverage of Indian and world geography including physical, economic, and human geography. Features detailed maps, case studies, and environmental issues.',
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
      description: 'Strategic approach to BPSC examination with subject-wise preparation tips and previous year questions. Includes Bihar-specific topics and current affairs.',
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
      description: 'Comprehensive study material for UPPCS examination covering all relevant subjects and topics. Includes UP-specific current affairs and administrative knowledge.',
      author: 'UPPCS Expert',
      category: 'UPPCS',
      coverImage: '/uploads/uppcs.jpg',
      pdfUrl: '/uploads/uppcs-study-material.pdf',
      fileSize: '11.8 MB',
        pages: 350,
      language: 'English'
      },
      {
      title: 'History of Modern India',
      subtitle: 'From 1857 to present day',
      description: 'Comprehensive coverage of modern Indian history including freedom struggle, post-independence developments, and contemporary issues.',
      author: 'History Expert',
      category: 'General Studies',
      coverImage: '/uploads/history.jpg',
      pdfUrl: '/uploads/modern-india-history.pdf',
      fileSize: '13.4 MB',
      pages: 420,
      language: 'English'
      },
      {
      title: 'Environment and Ecology',
      subtitle: 'Environmental science and biodiversity',
      description: 'Complete coverage of environmental science, biodiversity, climate change, and environmental policies. Essential for UPSC and other competitive exams.',
      author: 'Environmental Expert',
      category: 'General Studies',
      coverImage: '/uploads/environment.jpg',
      pdfUrl: '/uploads/environment-ecology.pdf',
      fileSize: '7.9 MB',
        pages: 260,
      language: 'English'
      }
  ];

  console.log('📖 Creating sample e-books...');

  // Create e-books
  for (const ebookData of sampleEbooks) {
    const ebook = await prisma.eBook.create({
      data: ebookData
    });
    console.log(`✅ Created e-book: ${ebook.title}`);
  }

  console.log(`🎉 Successfully created ${sampleEbooks.length} sample e-books!`);
  console.log('📚 Digital Library is now ready for testing!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 