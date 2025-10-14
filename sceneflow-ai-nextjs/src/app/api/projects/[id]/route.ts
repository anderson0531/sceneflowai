import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import sequelize from '@/config/database'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15
    const { id } = await params
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project ID is required' 
      }, { status: 400 })
    }

    // Ensure database connection
    await sequelize.authenticate()
    
    console.log('[DELETE] Attempting to delete project:', id)

    const deleted = await Project.destroy({ where: { id } })
    
    if (deleted === 0) {
      console.log('[DELETE] Project not found:', id)
      return NextResponse.json({ 
        success: false, 
        error: 'Project not found' 
      }, { status: 404 })
    }
    
    console.log('[DELETE] Project deleted successfully:', id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/projects/[id] failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Delete failed' 
    }, { status: 500 })
  }
}

