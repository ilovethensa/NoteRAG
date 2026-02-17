import { Snippet } from '@/lib/client';

export type State = {
  snippets: Snippet[];
  newSnippet: string;
  editingId: number | null;
  editingContent: string;
  expandedSnippets: Set<number>;
  loading: boolean;
  error: string | null;
};

export type Action =
  | { type: 'SET_SNIPPETS'; payload: Snippet[] }
  | { type: 'SET_NEW_SNIPPET'; payload: string }
  | { type: 'START_EDITING'; payload: { id: number; content: string } }
  | { type: 'SET_EDITING_CONTENT'; payload: string }
  | { type: 'FINISH_EDITING' }
  | { type: 'TOGGLE_SNIPPET_EXPANSION'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

export const initialState: State = {
  snippets: [],
  newSnippet: '',
  editingId: null,
  editingContent: '',
  expandedSnippets: new Set(),
  loading: true,
  error: null,
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_SNIPPETS':
      return { ...state, snippets: action.payload, loading: false };
    case 'SET_NEW_SNIPPET':
      return { ...state, newSnippet: action.payload };
    case 'START_EDITING':
      return {
        ...state,
        editingId: action.payload.id,
        editingContent: action.payload.content,
      };
    case 'SET_EDITING_CONTENT':
      return { ...state, editingContent: action.payload };
    case 'FINISH_EDITING':
      return { ...state, editingId: null, editingContent: '' };
    case 'TOGGLE_SNIPPET_EXPANSION':
      const newSet = new Set(state.expandedSnippets);
      if (newSet.has(action.payload)) {
        newSet.delete(action.payload);
      } else {
        newSet.add(action.payload);
      }
      return { ...state, expandedSnippets: newSet };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
};
