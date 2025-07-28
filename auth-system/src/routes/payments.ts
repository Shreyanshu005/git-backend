import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

import Razorpay from 'razorpay';
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID!,
  key_secret: RAZORPAY_KEY_SECRET!,
});

const prisma = new PrismaClient();

// Razorpay: Generic payment order creation for all types
router.post('/create-session', authenticate, async (req, res) => {
  try {
    // Check if Razorpay credentials are configured
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        error: 'Razorpay credentials not configured',
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
      orderAmount = 499;
      orderNote = 'Digital Library Lifetime Access';
      itemTitle = 'Digital Library';
    } else if (type === 'course') {
      const course = await prisma.course.findUnique({ where: { id: itemId } });
      if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
      const safeId = (typeof itemId === 'string' && itemId.length > 0) ? itemId.replace(/[^a-zA-Z0-9]/g, '').slice(0,8) : Math.random().toString(36).substring(2,10);
      orderId = `ORDER_COURSE_${safeId}_${Date.now()}`;
      orderAmount = course.price;
      orderNote = `Purchase of course: ${course.title}`;
      itemTitle = course.title;
    } else if (type === 'testseries') {
      const testSeries = await prisma.testSeries.findUnique({ where: { id: itemId } });
      if (!testSeries) return res.status(404).json({ success: false, error: 'Test series not found' });
      const safeId = (typeof itemId === 'string' && itemId.length > 0) ? itemId.replace(/[^a-zA-Z0-9]/g, '').slice(0,8) : Math.random().toString(36).substring(2,10);
      orderId = `ORDER_TESTSERIES_${safeId}_${Date.now()}`;
      orderAmount = testSeries.price;
      orderNote = `Purchase of test series: ${testSeries.title}`;
      itemTitle = testSeries.title;
    } else {
      return res.status(400).json({ success: false, error: 'Invalid type' });
    }

    // Razorpay expects amount in paise (multiply by 100)
    const amountPaise = Math.round(orderAmount * 100);



    // Razorpay order creation
    const options = {
      amount: amountPaise,
      currency: 'INR',
      receipt: orderId,
      notes: {
        userId: userId,
        itemId: itemId,
        type: type,
        itemTitle: itemTitle,
        orderNote: orderNote,
      }
    };
    try {
      const order = await razorpay.orders.create(options);
      return res.json({
        success: true,
        orderId,
        razorpayOrderId: order.id,
        amount: order.amount,
        currency: order.currency,
        type,
        itemId,
        itemTitle
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create Razorpay order',
        details: err.message
      });
    }

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
    const { razorpayOrderId, paymentId, type, itemId } = req.body;
    const userId = req.user?.userId;
    if (!razorpayOrderId || !paymentId || !type || !itemId || !userId) {
      return res.status(400).json({ success: false, error: 'Missing razorpayOrderId, paymentId, type, itemId, or user not authenticated' });
    }

    // Always verify payment with Razorpay API (even in test mode)
    let enrolled = false;
    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(paymentId);
    if (!payment) {
      return res.status(400).json({ success: false, error: 'Payment not found in Razorpay' });
    }
    // Check payment status and order ID
    if (payment.status !== 'captured' || payment.order_id !== razorpayOrderId) {
      return res.status(400).json({ success: false, error: 'Payment not captured or order ID mismatch' });
    }
    // Enroll user based on type
    if (type === 'library') {
      await prisma.digitalLibrarySubscription.create({
        data: {
          userId,
          subscriptionType: 'lifetime',
          amount: 499,
          status: 'active',
          paymentId
        }
      });
      enrolled = true;
    } else if (type === 'course') {
      const existingPurchase = await prisma.coursePurchase.findFirst({ where: { userId, courseId: itemId, status: 'active' } });
      if (!existingPurchase) {
        await prisma.coursePurchase.create({ data: { userId, courseId: itemId, status: 'active' } });
      }
      enrolled = true;
    } else if (type === 'testseries') {
      const existingPurchase = await prisma.testSeriesPurchase.findFirst({ where: { userId, testSeriesId: itemId, status: 'active' } });
      if (!existingPurchase) {
        await prisma.testSeriesPurchase.create({ data: { userId, testSeriesId: itemId, status: 'active' } });
      }
      enrolled = true;
    }
    return res.json({ success: true, enrolled });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
});

export default router;