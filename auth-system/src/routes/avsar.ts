import { Router } from 'express';
const { body, param } = require('express-validator');
import { registerForAvsar, getAvsarRegistrations, updateAvsarStatus } from '../controllers/avsar';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Public route for submitting Avsar applications
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').matches(/^[0-9]{10,15}$/).withMessage('Valid phone number is required'),
    body('college').trim().notEmpty().withMessage('College/University is required'),
    body('enrollment').isIn(['UG', 'PG', 'Other']).withMessage('Valid enrollment status is required'),
    body('activity').isIn(['Yes', 'No']).withMessage('Please specify your activity status'),
    body('designExp').isIn(['None', 'Basic', 'Average', 'Advanced']).withMessage('Please specify your design experience level'),
    body('skills').trim().notEmpty().withMessage('Please describe your skills'),
    body('commitment').isIn(['Yes', 'No']).withMessage('Please specify your commitment'),
    body('sop').trim().notEmpty().withMessage('Statement of Purpose is required'),
  ],
  registerForAvsar
);

// Protected routes (admin only)
router.get(
  '/registrations',
  authenticate,
  getAvsarRegistrations
);

router.patch(
  '/registrations/:id/status',
  [
    authenticate,
    param('id').isUUID().withMessage('Valid registration ID is required'),
    body('status').isIn(['pending', 'reviewed', 'accepted', 'rejected']).withMessage('Invalid status'),
    body('notes').optional().isString(),
  ],
  updateAvsarStatus
);

export default router;
