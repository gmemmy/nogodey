export type User = {
  id: string
  name: string
  avatar: string
  isOnline: boolean
}

export type Message = {
  id: string
  text: string
  userId: string
  timestamp: Date
  isRead: boolean
  messageType: 'text' | 'image' | 'emoji'
}

export type Chat = {
  id: string
  participants: User[]
  messages: Message[]
  lastMessage?: Message | undefined
  unreadCount: number
  title: string
}

export type ChatListItem = {
  id: string
  title: string
  lastMessage: string
  lastMessageTime: Date
  unreadCount: number
  avatar: string
  isOnline: boolean
}
