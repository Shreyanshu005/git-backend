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

// Create a payment session (order)
router.post('/create-session', async (req, res) => {
  try {
    const { customerId, customerName, customerEmail, customerPhone } = req.body;
    const orderId = 'DLIB_' + Date.now();
    const orderAmount = 499;
    const orderCurrency = 'INR';

    const response = await axios.post(
      `${BASE_URL}/pg/orders`,
      {
        order_id: orderId,
        order_amount: orderAmount,
        order_currency: orderCurrency,
        customer_details: {
          customer_id: customerId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
        },
        order_note: 'Digital Library Lifetime Access',
      },
      {
        headers: {
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY,
          'Content-Type': 'application/json',
          'x-api-version': '2022-09-01',
        },
      }
    );

    return res.json({
      success: true,
      orderId,
      paymentSessionId: response.data.payment_session_id,
      cashfreeOrder: response.data,
    });
  } catch (err: any) {
    console.error('Cashfree create-session error:', err.response?.data || err.message);
    return res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
});

// Verify payment (after frontend callback)
router.post('/verify', async (req, res) => {
  try {
    const { orderId } = req.body;
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
    // You can check response.data.order_status === 'PAID'
    return res.json({ success: true, order: response.data });
  } catch (err: any) {
    console.error('Cashfree verify error:', err.response?.data || err.message);
    return res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
});

// Create a payment session for a course
router.post('/create-course-session', authenticate, async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user?.userId;
    if (!courseId || !userId) {
      return res.status(400).json({ success: false, error: 'Missing courseId or user not authenticated' });
    }
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    const orderId = `COURSE_${courseId}_${Date.now()}`;
    const orderAmount = course.price;
    const orderCurrency = 'INR';
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const response = await axios.post(
      `${BASE_URL}/pg/orders`,
      {
        order_id: orderId,
        order_amount: orderAmount,
        order_currency: orderCurrency,
        customer_details: {
          customer_id: user.id,
          customer_name: user.name,
          customer_email: user.email || 'test@example.com',
          customer_phone: user.mobileNumber || '9999999999',
        },
        order_note: `Purchase of course: ${course.title}`,
      },
      {
        headers: {
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY,
          'Content-Type': 'application/json',
          'x-api-version': '2022-09-01',
        },
      }
    );
    return res.json({
      success: true,
      orderId,
      paymentSessionId: response.data.payment_session_id,
      cashfreeOrder: response.data,
    });
  } catch (err: any) {
    console.error('Cashfree create-course-session error:', err.response?.data || err.message);
    return res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
});

// Verify course payment and enroll user
router.post('/verify-course', authenticate, async (req, res) => {
  try {
    const { orderId, courseId } = req.body;
    const userId = req.user?.userId;
    if (!orderId || !courseId || !userId) {
      return res.status(400).json({ success: false, error: 'Missing orderId, courseId, or user not authenticated' });
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
      // Enroll user in the course (create a Purchase record)
      await prisma.purchase.create({
        data: {
          userId,
          courseId,
          status: 'active',
        }
      });
      return res.json({ success: true, order: response.data, enrolled: true });
    } else {
      return res.json({ success: false, order: response.data, enrolled: false });
    }
  } catch (err: any) {
    console.error('Cashfree verify-course error:', err.response?.data || err.message);
    return res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
});

export default router; 