
import { Message, ChatThread } from '@/lib/client';

export type ChatState = {
  messages: Message[];
  input: string;
  loading: boolean;
  threads: ChatThread[];
  currentThreadId: number | null;
  currentThreadName: string;
  editingThreadId: number | null;
  editingThreadName: string;
  error: string | null;
};

export type ChatAction =
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_INPUT'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_THREADS'; payload: ChatThread[] }
  | { type: 'SET_CURRENT_THREAD'; payload: { id: number | null; name: string } }
  | { type: 'SET_EDITING_THREAD'; payload: { id: number | null; name: string } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_CHAT' };

export const initialChatState: ChatState = {
  messages: [],
  input: '',
  loading: false,
  threads: [],
  currentThreadId: null,
  currentThreadName: 'New Chat',
  editingThreadId: null,
  editingThreadName: '',
  error: null,
};

export const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_INPUT':
      return { ...state, input: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_THREADS':
      return { ...state, threads: action.payload };
    case 'SET_CURRENT_THREAD':
      return {
        ...state,
        currentThreadId: action.payload.id,
        currentThreadName: action.payload.name,
      };
    case 'SET_EDITING_THREAD':
      return {
        ...state,
        editingThreadId: action.payload.id,
        editingThreadName: action.payload.name,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET_CHAT':
      return {
        ...initialChatState,
        threads: state.threads, 
      };
    default:
      return state;
  }
};
