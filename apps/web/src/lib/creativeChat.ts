export type CreativeChatKind = 'image' | 'video';

export type CreativeChatMessage = {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

export type CreativeChatResult = {
  id: string;
  kind: CreativeChatKind;
  prompt: string;
  model: string;
  meta: string; // e.g., "9:16 · 2K"
  fee: number;
  mediaUrl: string;
  timestamp: number;
};

export type CreativeChat = {
  id: string;
  kind: CreativeChatKind;
  prompt: string;
  messages: CreativeChatMessage[];
  result: CreativeChatResult | null;
  timestamp: number;
};

const STORAGE_KEY = 'creative_chats';

export function getChats(): CreativeChat[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChats(chats: CreativeChat[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch (err) {
    console.error('Failed to save chats:', err);
  }
}

export function addChat(kind: CreativeChatKind, prompt: string): CreativeChat {
  const chats = getChats();
  const chat: CreativeChat = {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    kind,
    prompt,
    messages: [
      {
        id: `msg_${Date.now()}`,
        type: 'user',
        content: prompt,
        timestamp: Date.now(),
      },
    ],
    result: null,
    timestamp: Date.now(),
  };
  chats.unshift(chat);
  saveChats(chats);
  return chat;
}

export function updateChatResult(
  chatId: string,
  result: CreativeChatResult
): CreativeChat | null {
  const chats = getChats();
  const chat = chats.find((c) => c.id === chatId);
  if (!chat) return null;
  chat.result = result;
  chat.messages.push({
    id: `msg_${Date.now()}`,
    type: 'assistant',
    content: '生成完成',
    timestamp: Date.now(),
  });
  saveChats(chats);
  return chat;
}

export function deleteChat(chatId: string): void {
  const chats = getChats().filter((c) => c.id !== chatId);
  saveChats(chats);
}

export function clearChats(): void {
  localStorage.removeItem(STORAGE_KEY);
}
