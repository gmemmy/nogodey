import {format} from 'date-fns'
import {StyleSheet, Text, View} from 'react-native'
import type {Message, User} from '../types'

type Props = {
  message: Message
  user: User
  isCurrentUser: boolean
  showTimestamp?: boolean
}

export const MessageBubble = ({message, user, isCurrentUser, showTimestamp = false}: Props) => {
  const formatTime = (date: Date) => {
    return format(date, 'HH:mm')
  }

  return (
    <View
      style={[
        styles.container,
        isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
      ]}
    >
      {!isCurrentUser && (
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>{user.avatar}</Text>
        </View>
      )}

      <View style={styles.messageContainer}>
        <View
          style={[styles.bubble, isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble]}
        >
          <Text
            style={[
              styles.messageText,
              isCurrentUser ? styles.currentUserText : styles.otherUserText,
            ]}
          >
            {message.text}
          </Text>
        </View>

        {showTimestamp && (
          <Text
            style={[
              styles.timestamp,
              isCurrentUser ? styles.currentUserTimestamp : styles.otherUserTimestamp,
            ]}
          >
            {formatTime(message.timestamp)}
            {isCurrentUser && (
              <Text style={styles.readIndicator}>{message.isRead ? ' ✓✓' : ' ✓'}</Text>
            )}
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: 16,
  },
  currentUserContainer: {
    justifyContent: 'flex-end',
  },
  otherUserContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9ff',
    textAlign: 'center',
    lineHeight: 32,
    fontSize: 16,
    overflow: 'hidden',
  },
  messageContainer: {
    maxWidth: '75%',
    minWidth: '20%',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 4,
  },
  currentUserBubble: {
    backgroundColor: '#8b5cf6',
    borderBottomRightRadius: 6,
    shadowColor: '#8b5cf6',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  otherUserBubble: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 6,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  },
  currentUserText: {
    color: '#ffffff',
  },
  otherUserText: {
    color: '#1f2937',
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  currentUserTimestamp: {
    textAlign: 'right',
    color: '#9ca3af',
  },
  otherUserTimestamp: {
    textAlign: 'left',
    color: '#9ca3af',
    marginLeft: 4,
  },
  readIndicator: {
    color: '#4ade80',
    fontSize: 12,
  },
})
