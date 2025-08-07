import { Request, Response } from 'express';
import { prisma } from '../config/database';
const { validationResult } = require('express-validator');

// Type assertion for the validation result
declare global {
  namespace Express {
    interface Request {
      validationErrors?: any[];
    }
  }
}

interface AvsarRegistrationData {
  name: string;
  email: string;
  phone: string;
  college: string;
  enrollment: string;
  activity: string;
  designExp: string;
  skills: string;
  commitment: string;
  sop: string;
}

export const registerForAvsar = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      email,
      phone,
      college,
      enrollment,
      activity,
      designExp,
      skills,
      commitment,
      sop,
    } = req.body as AvsarRegistrationData;

    // Check if email or phone already exists
    const existingRegistration = await prisma.avsarRegistration.findFirst({
      where: {
        OR: [
          { email },
          { phone },
        ],
      },
    });

    if (existingRegistration) {
      return res.status(400).json({
        error: 'Email or phone number already registered for the Avsar program',
      });
    }

    // Create new registration
    const registration = await prisma.avsarRegistration.create({
      data: {
        name,
        email,
        phone,
        college,
        enrollment,
        activity,
        designExp,
        skills,
        commitment,
        sop,
      },
    });

    return res.status(201).json({
      message: 'Registration successful! We will review your application and get back to you soon.',
      registrationId: registration.id,
    });
  } catch (error) {
    console.error('Error in Avsar registration:', error);
    return res.status(500).json({
      error: 'An error occurred while processing your registration',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getAvsarRegistrations = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    
    const whereClause = status ? { status: String(status) } : {};
    
    const registrations = await prisma.avsarRegistration.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json(registrations);
  } catch (error) {
    console.error('Error fetching Avsar registrations:', error);
    return res.status(500).json({
      error: 'An error occurred while fetching registrations',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const updateAvsarStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['pending', 'reviewed', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be one of: pending, reviewed, accepted, rejected',
      });
    }

    const updatedRegistration = await prisma.avsarRegistration.update({
      where: { id },
      data: {
        status,
        ...(notes && { notes }),
      },
    });

    return res.status(200).json(updatedRegistration);
  } catch (error) {
    console.error('Error updating Avsar registration status:', error);
    return res.status(500).json({
      error: 'An error occurred while updating the registration status',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
