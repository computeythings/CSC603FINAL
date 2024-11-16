import { NextResponse, NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  // Check for the access token in cookies or headers
  const token = req.cookies.get('accessToken') || req.headers.get('authorization')

  // If no valid token, redirect to the login page
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Continue to the requested page if the token is valid
  return NextResponse.next()
}

// Apply middleware to all routes except /login and public pages
export const config = {
  matcher: ['/((?!login|public).*)'], // Adjust to include any other pages you want to skip
}
