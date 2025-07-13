const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSubscriptionSystem() {
  console.log('🧪 Testing Digital Library Subscription System\n');

  try {
    // 1. Create a test user
    console.log('1. Creating test user...');
    const testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        mobileNumber: '9999999999',
        email: 'test@example.com',
        isVerified: true
      }
    });
    console.log(`✅ Created user: ${testUser.name} (ID: ${testUser.id})\n`);

    // 2. Check if user has subscription (should be false initially)
    console.log('2. Checking initial subscription status...');
    const initialSubscription = await prisma.digitalLibrarySubscription.findFirst({
      where: {
        userId: testUser.id,
        status: 'active',
        OR: [
          { subscriptionType: 'lifetime' },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });
    console.log(`📊 Initial subscription status: ${initialSubscription ? 'Active' : 'No subscription'}\n`);

    // 3. Create a subscription (simulating successful payment)
    console.log('3. Creating subscription after payment...');
    const subscription = await prisma.digitalLibrarySubscription.create({
      data: {
        userId: testUser.id,
        subscriptionType: 'lifetime',
        amount: 49900, // ₹499 in paise
        status: 'active',
        paymentId: 'DLIB_1234567890'
      }
    });
    console.log(`✅ Created subscription: ${subscription.subscriptionType} (ID: ${subscription.id})\n`);

    // 4. Check subscription status again
    console.log('4. Checking subscription status after creation...');
    const activeSubscription = await prisma.digitalLibrarySubscription.findFirst({
      where: {
        userId: testUser.id,
        status: 'active',
        OR: [
          { subscriptionType: 'lifetime' },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });
    console.log(`📊 Current subscription status: ${activeSubscription ? 'Active' : 'No subscription'}`);
    if (activeSubscription) {
      console.log(`   - Type: ${activeSubscription.subscriptionType}`);
      console.log(`   - Amount: ₹${activeSubscription.amount / 100}`);
      console.log(`   - Status: ${activeSubscription.status}`);
      console.log(`   - Purchased: ${activeSubscription.purchasedAt.toLocaleDateString()}`);
      console.log(`   - Expires: ${activeSubscription.expiresAt ? activeSubscription.expiresAt.toLocaleDateString() : 'Never (Lifetime)'}`);
    }
    console.log('');

    // 5. Get all e-books available
    console.log('5. Fetching available e-books...');
    const ebooks = await prisma.eBook.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        category: true,
        fileSize: true,
        pages: true
      }
    });
    console.log(`📚 Found ${ebooks.length} active e-books:`);
    ebooks.forEach((book, index) => {
      console.log(`   ${index + 1}. ${book.title} (${book.category}) - ${book.fileSize}, ${book.pages} pages`);
    });
    console.log('');

    // 6. Simulate downloading an e-book (with subscription check)
    console.log('6. Simulating e-book download...');
    if (ebooks.length > 0 && activeSubscription) {
      const firstBook = ebooks[0];
      console.log(`📥 User can download: ${firstBook.title}`);
      console.log(`   - User has active subscription: ✅`);
      console.log(`   - Book is available: ✅`);
      console.log(`   - Download URL would be: /digital-library/ebooks/${firstBook.id}/download`);
    } else if (!activeSubscription) {
      console.log('❌ User cannot download e-books - no active subscription');
    }
    console.log('');

    // 7. Show user's complete profile
    console.log('7. Complete user profile:');
    const userWithSubscriptions = await prisma.user.findUnique({
      where: { id: testUser.id },
      include: {
        librarySubscriptions: {
          orderBy: { purchasedAt: 'desc' }
        }
      }
    });
    console.log(`👤 User: ${userWithSubscriptions.name}`);
    console.log(`📱 Mobile: ${userWithSubscriptions.mobileNumber}`);
    console.log(`📧 Email: ${userWithSubscriptions.email}`);
    console.log(`✅ Verified: ${userWithSubscriptions.isVerified}`);
    console.log(`👑 Admin: ${userWithSubscriptions.isAdmin}`);
    console.log(`📅 Created: ${userWithSubscriptions.createdAt.toLocaleDateString()}`);
    console.log(`📚 Subscriptions: ${userWithSubscriptions.librarySubscriptions.length}`);
    userWithSubscriptions.librarySubscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.subscriptionType} - ${sub.status} - ₹${sub.amount / 100}`);
    });
    console.log('');

    // 8. Clean up (optional - comment out if you want to keep the test data)
    console.log('8. Cleaning up test data...');
    await prisma.digitalLibrarySubscription.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testSubscriptionSystem(); 