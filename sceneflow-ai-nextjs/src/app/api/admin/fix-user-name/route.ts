/**
 * Admin API to fix user first_name in database
 * POST /api/admin/fix-user-name
 * 
 * This is a one-time fix for users who registered before first_name was properly captured
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { User } from '@/models/User'

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, firstName, lastName } = body

    // Only allow users to update their own record, or specific admin emails
    const isAdmin = session.user.email === 'anderson0531@gmail.com'
    const isSelf = session.user.email === email

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Find and update the user
    const user = await User.findOne({ where: { email } })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update first_name and optionally last_name
    const updates: any = {}
    if (firstName) updates.first_name = firstName
    if (lastName) updates.last_name = lastName

    await user.update(updates)

    console.log(`[fix-user-name] Updated user ${email}: first_name=${firstName}, last_name=${lastName}`)

    return NextResponse.json({
      success: true,
      message: 'User name updated successfully',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      }
    })
  } catch (error) {
    console.error('[fix-user-name] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check current user info
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await User.findOne({ where: { email: session.user.email } })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name
      }
    })
  } catch (error) {
    console.error('[fix-user-name] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
