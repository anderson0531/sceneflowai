import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/services/AuthService'
import { User } from '@/models/User'

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const result = await AuthService.verifyToken(token)

    if (!result.success || !result.user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get full user data
    const user = await User.findByPk(result.user.id)
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
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const result = await AuthService.verifyToken(token)

    if (!result.success || !result.user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { first_name, last_name, email, username } = body

    // Get user
    const user = await User.findByPk(result.user.id)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prepare update data - only update fields that are provided and different
    const updateData: any = {}
    
    if (first_name !== undefined) updateData.first_name = first_name
    if (last_name !== undefined) updateData.last_name = last_name
    
    // Handle email update with validation
    if (email !== undefined && email !== user.email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({
        where: { 
          email,
          id: { [require('sequelize').Op.ne]: user.id } // Exclude current user
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
      // Check if username is already taken by another user
      const existingUser = await User.findOne({
        where: { 
          username,
          id: { [require('sequelize').Op.ne]: user.id } // Exclude current user
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

    // Refresh user data after update
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
