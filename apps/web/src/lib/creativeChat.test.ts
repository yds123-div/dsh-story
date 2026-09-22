import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getChats,
  saveChats,
  addChat,
  updateChatResult,
  deleteChat,
  clearChats,
  type CreativeChat,
} from './creativeChat';

const STORAGE_KEY = 'creative_chats';

describe('creativeChat', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getChats', () => {
    it('returns empty array when no data', () => {
      expect(getChats()).toEqual([]);
    });

    it('returns parsed chats from localStorage', () => {
      const mockChats: CreativeChat[] = [
        {
          id: 'chat_1',
          kind: 'image',
          prompt: 'test prompt',
          messages: [],
          result: null,
          timestamp: Date.now(),
        },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockChats));
      expect(getChats()).toEqual(mockChats);
    });

    it('handles corrupted data gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json');
      expect(getChats()).toEqual([]);
    });
  });

  describe('saveChats', () => {
    it('saves chats to localStorage', () => {
      const mockChats: CreativeChat[] = [
        {
          id: 'chat_1',
          kind: 'image',
          prompt: 'test',
          messages: [],
          result: null,
          timestamp: Date.now(),
        },
      ];
      saveChats(mockChats);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(mockChats));
    });
  });

  describe('addChat', () => {
    it('adds new chat and returns it', () => {
      const chat = addChat('image', '火影忍者 宇智波镜大战 宇智波斑');
      expect(chat.kind).toBe('image');
      expect(chat.prompt).toBe('火影忍者 宇智波镜大战 宇智波斑');
      expect(chat.messages).toHaveLength(1);
      expect(chat.messages[0].type).toBe('user');
      expect(chat.result).toBeNull();
      expect(chat.id).toMatch(/^chat_\d+_[a-z0-9]+$/);
    });

    it('prepends new chat to list', () => {
      addChat('image', 'first');
      addChat('video', 'second');
      const chats = getChats();
      expect(chats).toHaveLength(2);
      expect(chats[0].prompt).toBe('second');
      expect(chats[1].prompt).toBe('first');
    });
  });

  describe('updateChatResult', () => {
    it('updates chat with result and adds assistant message', () => {
      const chat = addChat('image', 'test prompt');
      const result = {
        id: 'res_1',
        kind: 'image' as const,
        prompt: 'test prompt',
        model: 'Seedream_4.5',
        meta: '9:16 · 2K',
        fee: 3,
        mediaUrl: 'test.jpg',
        timestamp: Date.now(),
      };
      const updated = updateChatResult(chat.id, result);
      expect(updated).not.toBeNull();
      expect(updated?.result).toEqual(result);
      expect(updated?.messages).toHaveLength(2);
      expect(updated?.messages[1].type).toBe('assistant');
    });

    it('returns null for non-existent chat', () => {
      const result = {
        id: 'res_1',
        kind: 'image' as const,
        prompt: 'test',
        model: 'Seedream_4.5',
        meta: '9:16 · 2K',
        fee: 3,
        mediaUrl: 'test.jpg',
        timestamp: Date.now(),
      };
      expect(updateChatResult('nonexistent', result)).toBeNull();
    });
  });

  describe('deleteChat', () => {
    it('removes chat from storage', () => {
      const chat1 = addChat('image', 'first');
      const chat2 = addChat('video', 'second');
      deleteChat(chat1.id);
      const chats = getChats();
      expect(chats).toHaveLength(1);
      expect(chats[0].id).toBe(chat2.id);
    });
  });

  describe('clearChats', () => {
    it('removes all chats from storage', () => {
      addChat('image', 'first');
      addChat('video', 'second');
      clearChats();
      expect(getChats()).toEqual([]);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });
});
