import { NextRequest, NextResponse } from 'next/server';
import {
  getSnippets,
  createSnippet,
  deleteSnippet,
  updateSnippet,
} from '@/lib/snippets';

export async function GET() {
  try {
    const snippets = await getSnippets();
    return NextResponse.json(snippets);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    await createSnippet(content);
    return NextResponse.json({ message: 'Snippet created' }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    await deleteSnippet(id);
    return NextResponse.json({ message: 'Snippet deleted' }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, content } = await req.json();
    if (!id || !content) {
      return NextResponse.json({ error: 'ID and content are required' }, { status: 400 });
    }
    await updateSnippet(id, content);
    return NextResponse.json({ message: 'Snippet updated' }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
