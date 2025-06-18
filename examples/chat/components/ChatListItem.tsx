import {format} from 'date-fns'
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native'
import type {ChatListItem} from '../types'

type Props = {
  item: ChatListItem
  onPress: (chatId: string) => void
}

export const ChatListItemComponent = ({item, onPress}: Props) => {
  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) {
      return `${minutes}m`
    }
    if (hours < 24) {
      return `${hours}h`
    }
    if (days < 7) {
      return `${days}d`
    }
    return format(date, 'MM/dd')
  }

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(item.id)} activeOpacity={0.7}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatar}>{item.avatar}</Text>
        {item.isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.time}>{formatTime(item.lastMessageTime)}</Text>
        </View>

        <View style={styles.messageRow}>
          <Text style={styles.lastMessage} numberOfLines={2}>
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount.toString()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f8f9ff',
    textAlign: 'center',
    lineHeight: 56,
    fontSize: 24,
    overflow: 'hidden',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4ade80',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  lastMessage: {
    fontSize: 15,
    color: '#6b7280',
    flex: 1,
    marginRight: 8,
    lineHeight: 20,
  },
  unreadBadge: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
})
