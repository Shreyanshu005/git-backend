import express from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_ENV = process.env.CASHFREE_ENV || 'test';

const BASE_URL = CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com'
  : 'https://sandbox.cashfree.com';

const prisma = new PrismaClient();

// Refactored: Generic payment session creation for all types
router.post('/create-session', authenticate, async (req, res) => {
  try {
    // Check if Cashfree credentials are configured
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      console.error('Cashfree credentials not configured:', { 
        appId: !!CASHFREE_APP_ID, 
        secretKey: !!CASHFREE_SECRET_KEY,
        env: CASHFREE_ENV 
      });
      return res.status(500).json({ 
        success: false, 
        error: 'Payment system not configured properly' 
      });
    }

    const { type, itemId } = req.body; // type: 'library' | 'course' | 'testseries'
    const userId = req.user?.userId;
    if (!type || !itemId || !userId) {
      return res.status(400).json({ success: false, error: 'Missing type, itemId, or user not authenticated' });
    }
    let orderId, orderAmount, orderNote;
    let itemTitle = '';
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (type === 'library') {
      orderId = `DLIB_${Date.now()}`;
      orderAmount = 499 * 100; // Convert to paise
      orderNote = 'Digital Library Lifetime Access';
      itemTitle = 'Digital Library';
    } else if (type === 'course') {
      const course = await prisma.course.findUnique({ where: { id: itemId } });
      if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
      // Sanitize itemId for orderId (max 8 chars, fallback to random if missing)
      const safeId = (typeof itemId === 'string' && itemId.length > 0) ? itemId.replace(/[^a-zA-Z0-9]/g, '').slice(0,8) : Math.random().toString(36).substring(2,10);
      orderId = `ORDER_COURSE_${safeId}_${Date.now()}`;
      orderAmount = course.price * 100; // Convert to paise
      orderNote = `Purchase of course: ${course.title}`;
      itemTitle = course.title;
    } else if (type === 'testseries') {
      const testSeries = await prisma.testSeries.findUnique({ where: { id: itemId } });
      if (!testSeries) return res.status(404).json({ success: false, error: 'Test series not found' });
      // Sanitize itemId for orderId (max 8 chars, fallback to random if missing)
      const safeId = (typeof itemId === 'string' && itemId.length > 0) ? itemId.replace(/[^a-zA-Z0-9]/g, '').slice(0,8) : Math.random().toString(36).substring(2,10);
      orderId = `ORDER_TESTSERIES_${safeId}_${Date.now()}`;
      orderAmount = testSeries.price * 100; // Convert to paise
      orderNote = `Purchase of test series: ${testSeries.title}`;
      itemTitle = testSeries.title;
    } else {
      return res.status(400).json({ success: false, error: 'Invalid type' });
    }
    const requestBody = {
        order_id: orderId,
        order_amount: orderAmount,
        order_currency: 'INR',
        customer_details: {
          customer_id: user.id.toString(),
          customer_name: user.name,
          customer_email: user.email || 'test@example.com',
          customer_phone: user.mobileNumber || '9999999999',
        },
        order_note: orderNote,
    };

    console.log('Creating Cashfree order with:', {
      url: `${BASE_URL}/pg/orders`,
      orderId,
      orderAmount,
      type,
      itemId
    });

    const response = await axios.post(
      `${BASE_URL}/pg/orders`,
      requestBody,
      {
        headers: {
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY,
          'Content-Type': 'application/json',
          'x-api-version': '2022-09-01',
        },
      }
    );

    console.log('Cashfree API response:', {
      status: response.status,
      hasPaymentSessionId: !!response.data.payment_session_id,
      responseData: response.data
    });
    if (!response.data.payment_session_id) {
      // For development/testing, create a mock payment session
      if (CASHFREE_ENV === 'test') {
        console.log('Creating mock payment session for test environment');
        return res.json({
          success: true,
          orderId,
          paymentSessionId: `mock_session_${orderId}`,
          cashfreeOrder: response.data,
          type,
          itemId,
          itemTitle,
          isMock: true
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        error: 'Payment session ID not received from Cashfree',
        response: response.data 
      });
    }
    return res.json({
      success: true,
      orderId,
      paymentSessionId: response.data.payment_session_id,
      cashfreeOrder: response.data,
      type,
      itemId,
      itemTitle
    });
  } catch (err: any) {
    console.error('Error creating payment session:', {
      error: err.message,
      response: err.response?.data,
      status: err.response?.status
    });
    return res.status(500).json({ 
      success: false, 
      error: err.response?.data || err.message,
      details: err.response?.data
    });
  }
});

// Refactored: Generic payment verification for all types
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { orderId, type, itemId } = req.body;
    const userId = req.user?.userId;
    if (!orderId || !type || !itemId || !userId) {
      return res.status(400).json({ success: false, error: 'Missing orderId, type, itemId, or user not authenticated' });
    }

    // Handle mock payments for testing
    if (orderId.startsWith('mock_session_') || CASHFREE_ENV === 'test') {
      console.log('Processing mock payment verification for:', { orderId, type, itemId, userId });
      
      if (type === 'library') {
        await prisma.digitalLibrarySubscription.create({
          data: {
            userId,
            subscriptionType: 'lifetime',
            amount: 499,
            status: 'active',
            paymentId: orderId
          }
        });
      } else if (type === 'course') {
        const existingPurchase = await prisma.coursePurchase.findFirst({
          where: { userId, courseId: itemId, status: 'active' }
        });
        
        if (!existingPurchase) {
          await prisma.coursePurchase.create({
            data: {
              userId,
              courseId: itemId,
              status: 'active',
            }
          });
        }
      } else if (type === 'testseries') {
        const existingPurchase = await prisma.testSeriesPurchase.findFirst({
          where: { userId, testSeriesId: itemId, status: 'active' }
        });
        
        if (!existingPurchase) {
          await prisma.testSeriesPurchase.create({
            data: {
              userId,
              testSeriesId: itemId,
              status: 'active',
            }
          });
        }
      }
      
      return res.json({ 
        success: true, 
        order: { order_status: 'PAID', order_id: orderId },
        enrolled: true,
        isMock: true
      });
    }
    const response = await axios.get(
      `${BASE_URL}/pg/orders/${orderId}`,
      {
        headers: {
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY,
          'x-api-version': '2022-09-01',
        },
      }
    );
    if (response.data.order_status === 'PAID') {
      console.log('Payment verified as PAID, creating purchase record...');
      console.log('Type:', type, 'ItemId:', itemId, 'UserId:', userId);
      
      if (type === 'library') {
        // Create digital library subscription
        console.log('Creating digital library subscription...');
        await prisma.digitalLibrarySubscription.create({
          data: {
            userId,
            subscriptionType: 'lifetime',
            amount: 499,
            status: 'active',
            paymentId: orderId
          }
        });
        console.log('Digital library subscription created successfully');
      } else if (type === 'course') {
        console.log('Creating course purchase...');
        
        // Check if purchase already exists
        const existingPurchase = await prisma.coursePurchase.findFirst({
          where: { userId, courseId: itemId, status: 'active' }
        });
        
        if (existingPurchase) {
          console.log('Course purchase already exists:', existingPurchase.id);
        } else {
          const purchase = await prisma.coursePurchase.create({
            data: {
              userId,
              courseId: itemId,
              status: 'active',
            }
          });
          console.log('Course purchase created successfully:', purchase.id);
        }
      } else if (type === 'testseries') {
        console.log('Creating test series purchase...');
        console.log('TestSeriesPurchase data:', { userId, testSeriesId: itemId, status: 'active' });
        
        // Check if purchase already exists
        const existingPurchase = await prisma.testSeriesPurchase.findFirst({
          where: { userId, testSeriesId: itemId, status: 'active' }
        });
        
        if (existingPurchase) {
          console.log('Test series purchase already exists:', existingPurchase.id);
        } else {
          const purchase = await prisma.testSeriesPurchase.create({
            data: {
              userId,
              testSeriesId: itemId,
              status: 'active',
            }
          });
          console.log('Test series purchase created successfully:', purchase.id);
        }
      }
      return res.json({ success: true, order: response.data, enrolled: true });
    } else {
      return res.json({ success: false, order: response.data, enrolled: false });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
});

export default router; 