import axios from 'axios';

// Store OTP sessions (in production, use Redis)
const otpSessions = new Map<string, { sessionId: string; expires: number }>();

// Generate a 6-digit OTP
export const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP using 2factor.in
export const sendOTP = async (mobileNumber: string, otp: string): Promise<void> => {
    try {
        const apiKey = process.env.TWO_FACTOR_API_KEY;
        if (!apiKey) {
            console.error('2Factor API key is missing');
            throw new Error('2Factor API key not configured');
        }

        // Format mobile number (remove any spaces or special characters)
        const formattedNumber = mobileNumber.replace(/\D/g, '');
        console.log('Sending OTP to formatted number:', formattedNumber);

        // Send OTP via 2factor.in SMS API
        const url = `https://2factor.in/API/V1/${apiKey}/SMS/+91${formattedNumber}/${otp}`;
        console.log('Sending request to:', url);

        const response = await axios.get(url);
        console.log('2Factor API Response:', response.data);

        if (response.data.Status !== 'Success') {
            console.error('2Factor API Error:', response.data);
            throw new Error(`Failed to send OTP: ${response.data.Details || 'Unknown error'}`);
        }

        // Store the session ID for verification
        otpSessions.set(formattedNumber, {
            sessionId: response.data.Details,
            expires: Date.now() + 10 * 60 * 1000 // 10 minutes
        });

        console.log(`OTP sent successfully to ${formattedNumber}`);
    } catch (error: any) {
        console.error('Error sending OTP:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            url: error.config?.url
        });
        throw new Error(`Failed to send OTP: ${error.message}`);
    }
};

// Verify OTP using 2factor.in
export const verifyOTP = async (mobileNumber: string, otp: string): Promise<{ success: boolean; message: string }> => {
    try {
        const apiKey = process.env.TWO_FACTOR_API_KEY;
        if (!apiKey) {
            console.error('2Factor API key is missing');
            return {
                success: false,
                message: '2Factor API key not configured'
            };
        }

        // Format mobile number
        const formattedNumber = mobileNumber.replace(/\D/g, '');
        console.log('Verifying OTP for number:', formattedNumber);

        // Get stored session
        const session = otpSessions.get(formattedNumber);
        if (!session) {
            return {
                success: false,
                message: 'OTP session expired or not found'
            };
        }

        if (Date.now() > session.expires) {
            otpSessions.delete(formattedNumber);
            return {
                success: false,
                message: 'OTP session expired'
            };
        }

        // Verify OTP via 2factor.in API
        const verifyUrl = `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY/${session.sessionId}/${otp}`;
        console.log('Verification URL:', verifyUrl);

        const response = await axios.get(verifyUrl);
        console.log('2Factor Verify OTP Response:', response.data);

        if (response.data.Status === 'Success') {
            // Clear the session after successful verification
            otpSessions.delete(formattedNumber);
            return {
                success: true,
                message: 'OTP verified successfully'
            };
        } else {
            return {
                success: false,
                message: response.data.Details || 'Invalid OTP'
            };
        }
    } catch (error: any) {
        console.error('Error verifying OTP:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        return {
            success: false,
            message: error.response?.data?.Details || error.message || 'Failed to verify OTP'
        };
    }
}; 