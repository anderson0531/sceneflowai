import { NextResponse } from 'next/server';
import { generateSeriesBible } from '@/lib/ai/series-architect';
// Assume you have a db client, like Prisma or Supabase
// import { db } from '@/lib/db';

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { selectedConcept, userEmail } = await req.json();

    if (!selectedConcept) {
      return NextResponse.json({ error: 'No concept selected' }, { status: 400 });
    }

    const seriesBible = await generateSeriesBible(selectedConcept);

    // This is a placeholder for your actual database logic
    const newProject = {
      id: `proj_${Math.random().toString(36).substr(2, 9)}`,
      userId: userEmail,
      ...seriesBible,
      status: 'draft'
    };

    // await db.seriesProject.create({ data: newProject });

    return NextResponse.json({ success: true, projectId: newProject.id });

  } catch (error: any) {
    console.error('Series Init Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
