import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import User from '@/models/User';
import { sequelize } from '@/config/database';

export async function POST(req: NextRequest) {
  try {
    await sequelize.sync();
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }
    
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
    }
    
    const password_hash = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      username,
      email,
      password_hash,
    });

    return NextResponse.json({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

