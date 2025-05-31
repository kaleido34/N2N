import { jwtVerify, JWTPayload } from "jose";

interface MyJWTPayload extends JWTPayload {
  user_id: string;
  username: string;
  first_name: string;
  last_name: string;
}

export interface TokenVerificationResult {
  payload: MyJWTPayload | null;
  error: string | null;
  isExpired: boolean;
}

export async function verifyJwtToken(
  token: string,
  secret: string
): Promise<MyJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    return payload as MyJWTPayload;
  } catch (error: any) {
    if (error.code === 'ERR_JWT_EXPIRED') {
      console.error('JWT Token has expired');
    } else {
      console.error('JWT Verification failed:', error.message);
    }
    return null;
  }
}

// Enhanced version with more detailed error reporting
export async function verifyJwtTokenWithDetails(
  token: string,
  secret: string
): Promise<TokenVerificationResult> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    
    return {
      payload: payload as MyJWTPayload,
      error: null,
      isExpired: false
    };
  } catch (error: any) {
    // Handle expired tokens specifically
    if (error.code === 'ERR_JWT_EXPIRED') {
      return {
        payload: null,
        error: 'Token has expired. Please log in again.',
        isExpired: true
      };
    }
    
    // Handle other verification errors
    return {
      payload: null,
      error: 'Invalid token. Authentication failed.',
      isExpired: false
    };
  }
}
