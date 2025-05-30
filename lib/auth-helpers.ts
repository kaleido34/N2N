import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJwtToken } from "@/lib/jwt";

/**
 * Helper function to authenticate a user from a request
 * @param req The Next.js request object
 * @returns Object containing the authenticated user or an error response
 */
export async function authenticateUser(req: NextRequest) {
  try {
    // Get token from authorization header (case-insensitive)
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    let token = "";
    
    // Handle both formats: "Bearer token" or just "token"
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else {
      token = authHeader;
    }
    
    if (!token) {
      return {
        user: null,
        error: NextResponse.json(
          { message: "Missing authorization token." },
          { status: 401 }
        )
      };
    }
    
    // Verify token
    const user = await verifyJwtToken(token, process.env.JWT_SECRET!);
    
    if (!user || !user.user_id) {
      return {
        user: null,
        error: NextResponse.json(
          { message: "Invalid or expired token." },
          { status: 403 }
        )
      };
    }
    
    // Return authenticated user
    return { user, error: null };
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      user: null,
      error: NextResponse.json(
        { message: "Error during authentication." },
        { status: 500 }
      )
    };
  }
}

/**
 * Helper function to check if a user has access to a specific content
 * @param userId The user ID
 * @param contentId The content ID
 * @returns Boolean indicating if the user has access to the content
 */
export async function checkContentAccess(userId: string, contentId: string) {
  try {
    const userContentExist = await prisma.userContent.findUnique({
      where: {
        user_id_content_id: {
          user_id: userId,
          content_id: contentId
        }
      }
    });
    
    return !!userContentExist;
  } catch (error) {
    console.error("Error checking content access:", error);
    return false;
  }
}
