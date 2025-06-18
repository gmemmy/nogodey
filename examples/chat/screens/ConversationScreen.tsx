import {LegendList, type LegendListRef} from '@legendapp/list'
import * as React from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import {MessageBubble} from '../components/MessageBubble'
import {MessageInput} from '../components/MessageInput'
import {mockChats, mockUsers} from '../mockData'
import type {Chat, Message} from '../types'

type Props = {
  chatId: string
  onBack: () => void
}

export const ConversationScreen = ({chatId, onBack}: Props) => {
  const listRef = React.useRef<LegendListRef | null>(null)
  const [chat, setChat] = React.useState<Chat | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])

  React.useEffect(() => {
    const foundChat = mockChats.find(c => c.id === chatId)
    if (foundChat) {
      setChat(foundChat)
      setMessages(foundChat.messages)
    }
  }, [chatId])

  const handleSendMessage = (text: string) => {
    if (!chat) return

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text,
      userId: 'current-user',
      timestamp: new Date(),
      isRead: false,
      messageType: 'text',
    }

    setMessages(prev => [...prev, newMessage])

    // Scroll to bottom after sending
    setTimeout(() => {
      listRef.current?.scrollToEnd({animated: true})
    }, 100)
  }

  const renderMessage = ({item, index}: {item: Message; index: number}) => {
    const user = mockUsers.find(u => u.id === item.userId)
    const isCurrentUser = item.userId === 'current-user'
    const previousMessage = index > 0 ? messages[index - 1] : null
    const shouldShowTimestamp =
      !previousMessage || item.timestamp.getTime() - previousMessage.timestamp.getTime() > 300000 // 5 minutes

    if (!user) return null

    return (
      <MessageBubble
        message={item}
        user={user}
        isCurrentUser={isCurrentUser}
        showTimestamp={shouldShowTimestamp}
      />
    )
  }

  const keyExtractor = (item: Message) => item.id

  if (!chat) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Chat not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  const otherUser = chat.participants.find(p => p.id !== 'current-user')

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{chat.title}</Text>
          <Text style={styles.headerSubtitle}>
            {otherUser?.isOnline ? 'Online' : 'Last seen recently'} {otherUser?.avatar}
          </Text>
        </View>

        <View style={styles.headerActions} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LegendList
          ref={listRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            listRef.current?.scrollToEnd({animated: true})
          }}
        />

        <MessageInput onSendMessage={handleSendMessage} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  headerActions: {
    width: 40,
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  messagesContent: {
    paddingVertical: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    fontWeight: '500',
  },
})
