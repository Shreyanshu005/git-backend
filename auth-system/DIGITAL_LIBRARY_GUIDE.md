# Digital Library Subscription System Guide

## Overview
The digital library system allows users to purchase lifetime access to a collection of e-books for competitive exam preparation. Users can browse e-books without a subscription but need to purchase access to download them.

## Database Models

### 1. User Model
```prisma
model User {
  id            String   @id @default(uuid())
  name          String   @db.VarChar(100)
  mobileNumber  String   @unique @db.VarChar(15)
  email         String?  @unique @db.VarChar(100)
  isVerified    Boolean  @default(false)
  isAdmin       Boolean  @default(false)
  version       Int      @default(0)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  purchases     Purchase[]
  librarySubscriptions DigitalLibrarySubscription[]

  @@map("users")
}
```

### 2. DigitalLibrarySubscription Model
```prisma
model DigitalLibrarySubscription {
  id           String   @id @default(uuid())
  user         User     @relation(fields: [userId], references: [id])
  userId       String
  subscriptionType String @default("lifetime") // "lifetime", "monthly", "yearly"
  amount       Int      @default(499) // Amount in paise (49900 for ₹499)
  status       String   @default("active") // "active", "expired", "cancelled"
  purchasedAt  DateTime @default(now())
  expiresAt    DateTime? // null for lifetime subscriptions
  paymentId    String?  // For payment gateway reference
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("digital_library_subscriptions")
}
```

### 3. EBook Model
```prisma
model EBook {
  id          String   @id @default(uuid())
  title       String
  subtitle    String
  description String
  author      String
  category    String   // e.g., 'UPSC', 'BPSC', 'UPPCS', 'General Studies'
  coverImage  String
  pdfUrl      String
  fileSize    String   // e.g., "2.5 MB"
  pages       Int
  language    String   @default("English")
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("ebooks")
}
```

## How It Works

### 1. User Registration
- Users register with mobile number and email
- User record is created in the `users` table
- Initially, no subscription exists

### 2. Browsing E-books
- Users can browse all active e-books without subscription
- E-books are categorized by exam type (UPSC, BPSC, UPPCS, etc.)
- Users can see book details but cannot download

### 3. Subscription Purchase
When a user makes a payment:

1. **Payment Session Creation**: Order ID starts with `DLIB_` (e.g., `DLIB_1234567890`)
2. **Payment Processing**: Cashfree handles the payment
3. **Payment Verification**: Backend verifies payment status
4. **Subscription Creation**: If payment successful, subscription record is created

### 4. Subscription Activation
```javascript
// After successful payment verification
const subscription = await prisma.digitalLibrarySubscription.create({
  data: {
    userId: user.id,
    subscriptionType: 'lifetime',
    amount: 49900, // ₹499 in paise
    status: 'active',
    paymentId: orderId
  }
});
```

### 5. Access Control
When user tries to download an e-book:

```javascript
// Check if user has active subscription
const subscription = await prisma.digitalLibrarySubscription.findFirst({
  where: {
    userId: user.id,
    status: 'active',
    OR: [
      { subscriptionType: 'lifetime' },
      { expiresAt: { gt: new Date() } }
    ]
  }
});

if (!subscription) {
  // Show subscription modal or redirect to payment
  return res.status(403).json({ 
    error: 'Subscription required',
    message: 'You need an active digital library subscription to download e-books.'
  });
}
```

## API Endpoints

### Public Endpoints (No Authentication Required)
- `GET /digital-library/ebooks` - List all e-books
- `GET /digital-library/ebooks/:id` - Get e-book details

### Protected Endpoints (Authentication Required)
- `GET /digital-library/subscription/status` - Check user's subscription status
- `GET /digital-library/ebooks/:id/download` - Download e-book (requires subscription)
- `POST /digital-library/subscription/create` - Create subscription (after payment)

### Admin Endpoints (Admin Authentication Required)
- `POST /digital-library/admin/ebooks` - Add new e-book
- `GET /digital-library/admin/ebooks` - List all e-books (admin view)
- `DELETE /digital-library/admin/ebooks/:id` - Delete e-book
- `POST /digital-library/seed-ebooks` - Seed sample e-books

## Payment Flow

1. **User clicks "Buy Now"** on digital library page
2. **Payment session created** with order ID starting with `DLIB_`
3. **Cashfree payment popup** opens
4. **User completes payment**
5. **Redirect to success page** with order ID
6. **Payment verification** on success page
7. **Subscription creation** if payment verified
8. **User gets access** to download e-books

## Testing the System

### 1. Seed Sample Data
```bash
cd backend/auth-system
npx prisma db seed
```

### 2. Run Test Script
```bash
node test-subscription.js
```

### 3. Manual Testing
1. Register a new user
2. Browse digital library (should see e-books but no download access)
3. Click "Buy Now" to purchase subscription
4. Complete payment
5. Verify subscription is created
6. Try downloading e-books (should work now)

## Subscription Types

Currently supported:
- **Lifetime**: One-time payment, never expires
- **Monthly**: Expires after 30 days (future feature)
- **Yearly**: Expires after 365 days (future feature)

## Security Features

1. **Authentication Required**: All download operations require valid JWT token
2. **Subscription Validation**: Active subscription required for downloads
3. **Payment Verification**: Payment status verified before subscription activation
4. **Admin Access Control**: Only admin users can manage e-books

## Error Handling

- **No Subscription**: User sees subscription modal
- **Payment Failed**: User redirected to failure page
- **Invalid Token**: User redirected to login
- **Book Not Found**: 404 error returned
- **Server Error**: 500 error with appropriate message

## Future Enhancements

1. **Multiple Subscription Types**: Monthly/yearly subscriptions
2. **Subscription Renewal**: Automatic renewal options
3. **Usage Analytics**: Track which books are downloaded most
4. **Book Recommendations**: AI-powered book suggestions
5. **Reading Progress**: Track user reading progress
6. **Bookmarks and Notes**: User annotations feature 