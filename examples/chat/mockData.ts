import type {Chat, ChatListItem, Message, User} from './types'

export const mockUsers: User[] = [
  {
    id: 'current-user',
    name: 'You',
    avatar: '😊',
    isOnline: true,
  },
  {
    id: 'user-1',
    name: 'Sarah Chen',
    avatar: '🌸',
    isOnline: true,
  },
  {
    id: 'user-2',
    name: 'Alex Rodriguez',
    avatar: '🚀',
    isOnline: false,
  },
  {
    id: 'user-3',
    name: 'Maya Patel',
    avatar: '🎨',
    isOnline: true,
  },
  {
    id: 'user-4',
    name: 'Jordan Kim',
    avatar: '🎵',
    isOnline: true,
  },
  {
    id: 'user-5',
    name: 'Riley Thompson',
    avatar: '🏔️',
    isOnline: false,
  },
]

const createMessage = (
  id: string,
  text: string,
  userId: string,
  minutesAgo: number,
  isRead = true
): Message => ({
  id,
  text,
  userId,
  timestamp: new Date(Date.now() - minutesAgo * 60 * 1000),
  isRead,
  messageType: 'text' as const,
})

export const mockChats: Chat[] = [
  {
    id: 'chat-1',
    title: 'Sarah Chen',
    participants: [mockUsers[0]!, mockUsers[1]!],
    unreadCount: 2,
    messages: [
      createMessage('msg-1', 'Hey! How was your weekend? 🌻', 'user-1', 120),
      createMessage('msg-2', 'It was amazing! Went hiking in the mountains', 'current-user', 115),
      createMessage('msg-3', 'That sounds incredible! Did you get any good photos?', 'user-1', 110),
      createMessage(
        'msg-4',
        "Yeah! I'll share them later. The sunset was breathtaking 🌅",
        'current-user',
        105
      ),
      createMessage(
        'msg-5',
        "Can't wait to see them! I love mountain sunsets",
        'user-1',
        30,
        false
      ),
      createMessage('msg-6', 'We should plan a trip together sometime! 🏔️', 'user-1', 25, false),
    ],
    lastMessage: undefined,
  },
  {
    id: 'chat-2',
    title: 'Alex Rodriguez',
    participants: [mockUsers[0]!, mockUsers[2]!],
    unreadCount: 0,
    messages: [
      createMessage('msg-7', 'Did you see the latest SpaceX launch? 🚀', 'user-2', 480),
      createMessage('msg-8', 'Yes! It was absolutely incredible', 'current-user', 475),
      createMessage('msg-9', 'The engineering behind it is mind-blowing', 'user-2', 470),
      createMessage(
        'msg-10',
        'I know right? Makes me want to become an astronaut 👨‍🚀',
        'current-user',
        465
      ),
    ],
    lastMessage: undefined,
  },
  {
    id: 'chat-3',
    title: 'Maya Patel',
    participants: [mockUsers[0]!, mockUsers[3]!],
    unreadCount: 1,
    messages: [
      createMessage('msg-11', 'Just finished my latest painting! 🎨', 'user-3', 180),
      createMessage('msg-12', "That's awesome! What did you paint this time?", 'current-user', 175),
      createMessage(
        'msg-13',
        'A vibrant sunset over the ocean. Lots of purples and oranges',
        'user-3',
        170
      ),
      createMessage('msg-14', "Sounds beautiful! You're so talented", 'current-user', 165),
      createMessage(
        'msg-15',
        'Thank you! Want to see it? I can send a photo 📸',
        'user-3',
        10,
        false
      ),
    ],
    lastMessage: undefined,
  },
  {
    id: 'chat-4',
    title: 'Jordan Kim',
    participants: [mockUsers[0]!, mockUsers[4]!],
    unreadCount: 3,
    messages: [
      createMessage('msg-16', 'Just discovered this amazing indie band! 🎵', 'user-4', 360),
      createMessage('msg-17', 'Oh cool! What genre?', 'current-user', 355),
      createMessage('msg-18', "It's like dreamy electronic with jazz influences", 'user-4', 350),
      createMessage(
        'msg-19',
        "That sounds right up my alley! What's the band name?",
        'current-user',
        345
      ),
      createMessage(
        'msg-20',
        'They\'re called "Neon Waves" - check out their song "Midnight Drive"',
        'user-4',
        15,
        false
      ),
      createMessage('msg-21', "I'm sending you the Spotify link 🎧", 'user-4', 10, false),
      createMessage('msg-22', 'Perfect for late night coding sessions!', 'user-4', 5, false),
    ],
    lastMessage: undefined,
  },
  {
    id: 'chat-5',
    title: 'Riley Thompson',
    participants: [mockUsers[0]!, mockUsers[5]!],
    unreadCount: 0,
    messages: [
      createMessage('msg-23', 'Planning my next backpacking trip! 🎒', 'user-5', 720),
      createMessage('msg-24', 'Where are you thinking of going?', 'current-user', 715),
      createMessage('msg-25', 'Either the Swiss Alps or Patagonia 🏔️', 'user-5', 710),
      createMessage('msg-26', 'Both sound incredible! I vote Patagonia', 'current-user', 705),
    ],
    lastMessage: undefined,
  },
]

// Add lastMessage to each chat
for (const chat of mockChats) {
  if (chat.messages.length > 0) {
    chat.lastMessage = chat.messages[chat.messages.length - 1]
  }
}

export const chatListData: ChatListItem[] = mockChats.map(chat => {
  const otherUser = chat.participants.find(p => p.id !== 'current-user')
  if (!otherUser) {
    throw new Error(`No other participant found in chat ${chat.id}`)
  }
  return {
    id: chat.id,
    title: chat.title,
    lastMessage: chat.lastMessage?.text || '',
    lastMessageTime: chat.lastMessage?.timestamp || new Date(),
    unreadCount: chat.unreadCount,
    avatar: otherUser.avatar,
    isOnline: otherUser.isOnline,
  }
})
