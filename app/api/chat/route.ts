import { NextRequest, NextResponse } from 'next/server';
import {
  getThreads,
  getMessages,
  createThread,
  addMessage,
  updateThreadName,
  deleteThread,
  clearAllChats,
  countMessagesInThread,
} from '@/lib/ai';
import { openai, withTransaction, recordTokenUsage } from '@/lib/server-utils';

export async function GET(req: NextRequest) {
  const threadId = req.nextUrl.searchParams.get('thread_id');

  try {
    if (threadId) {
      const messages = await getMessages(threadId);
      return NextResponse.json(messages);
    } else {
      const threads = await getThreads();
      return NextResponse.json(threads);
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 });
    }

    const { messages, thread_id: clientThreadId, name: threadName } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    let currentThreadId = clientThreadId;

    if (!currentThreadId) {
      currentThreadId = await createThread(threadName || 'New Chat');
    }

    if (messages.length === 0) {
      return NextResponse.json({ threadId: currentThreadId }, { status: 201 });
    }

    const assistantMessage = await withTransaction(async (client) => {
      const history = await getMessages(currentThreadId, client);

      const chatCompletion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [...history, ...messages],
      });

      const assistantMessage = chatCompletion.choices[0]?.message;
      const usage = chatCompletion.usage;

      if (usage) {
        await recordTokenUsage('chat', usage.total_tokens, client);
      }

      if (assistantMessage) {
        const userMessage = messages[messages.length - 1];
        await addMessage(currentThreadId, userMessage.role, userMessage.content, client);
        await addMessage(currentThreadId, assistantMessage.role, assistantMessage.content || '', client);

        const messageCount = await countMessagesInThread(currentThreadId, client);
        if (messageCount <= 2) {
          const threadAutoName =
            userMessage.content.length > 30 ? userMessage.content.substring(0, 30) + '...' : userMessage.content;
          await updateThreadName(currentThreadId, threadAutoName, client);
        }
      }
      return assistantMessage;
    });

    if (assistantMessage) {
      return NextResponse.json({ assistantMessage, threadId: currentThreadId });
    }

    return NextResponse.json({ error: 'No response from OpenAI' }, { status: 500 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const threadId = req.nextUrl.searchParams.get('thread_id');

  try {
    if (threadId) {
      await deleteThread(threadId);
      return NextResponse.json({ message: `Thread ${threadId} deleted` }, { status: 200 });
    } else {
      await clearAllChats();
      return NextResponse.json({ message: 'All chat history and threads cleared' }, { status: 200 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, name } = await req.json();
    if (!id || !name) {
      return NextResponse.json({ error: 'ID and name are required' }, { status: 400 });
    }
    await updateThreadName(id, name);
    return NextResponse.json({ message: 'Thread updated' }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
