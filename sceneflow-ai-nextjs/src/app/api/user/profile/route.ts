import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { User } from '@/models/User'
import { Op } from 'sequelize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find user by ID or email
    const user = await User.findOne({
      where: session.user.id 
        ? { id: session.user.id }
        : { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
        is_active: user.is_active,
        email_verified: user.email_verified,
        last_login: user.last_login,
        created_at: user.created_at
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find user by ID or email
    const user = await User.findOne({
      where: session.user.id 
        ? { id: session.user.id }
        : { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { first_name, last_name, email, username } = body

    // Prepare update data
    const updateData: any = {}
    
    if (first_name !== undefined) updateData.first_name = first_name
    if (last_name !== undefined) updateData.last_name = last_name
    
    // Handle email update with validation
    if (email !== undefined && email !== user.email) {
      const existingUser = await User.findOne({
        where: { 
          email,
          id: { [Op.ne]: user.id }
        }
      })
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already registered by another user' },
          { status: 400 }
        )
      }
      updateData.email = email
    }
    
    // Handle username update with validation
    if (username !== undefined && username !== user.username) {
      const existingUser = await User.findOne({
        where: { 
          username,
          id: { [Op.ne]: user.id }
        }
      })
      if (existingUser) {
        return NextResponse.json(
          { error: 'Username already taken by another user' },
          { status: 400 }
        )
      }
      updateData.username = username
    }

    // Only update if there are changes
    if (Object.keys(updateData).length > 0) {
      await user.update(updateData)
    }

    // Refresh user data
    await user.reload()

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
        is_active: user.is_active,
        email_verified: user.email_verified,
        last_login: user.last_login,
        created_at: user.created_at
      }
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

