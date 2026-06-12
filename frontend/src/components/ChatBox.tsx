import { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useExpense } from '../hooks/useExpenses';
import { useAuth } from '../hooks/useAuth';
import { expensesApi } from '../api/expenses';
import { GroupMember } from '../types';

export default function ChatBox({ expenseId, members = [] }: { expenseId: string, members?: GroupMember[] }) {
  const { user } = useAuth();
  const { isConnected } = useWebSocket(expenseId);
  const { messagesQuery } = useExpense(expenseId);
  const [content, setContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messagesQuery.data]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    try {
      await expensesApi.sendMessage(expenseId, content);
      setContent('');
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  return (
    <div className="flex h-[400px] flex-col rounded-lg border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="font-bold text-gray-700">Expense Chat</h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messagesQuery.isLoading ? (
          <div className="text-center text-gray-500">Loading messages...</div>
        ) : messagesQuery.data?.length === 0 ? (
          <div className="text-center text-gray-500">No messages yet.</div>
        ) : (
          messagesQuery.data?.map((msg) => {
            const isMe = msg.user_id === user?.id;
            const senderName = members.find(m => m.user_id === msg.user_id)?.user.name || 'Unknown';
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && <span className="mb-1 text-xs text-gray-500">{senderName}</span>}
                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                  <div className="break-words">{msg.content}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="border-t p-3 flex gap-2">
        <input
          type="text"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-1"
        />
        <button type="submit" disabled={!content.trim() || !isConnected} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}
