import {LegendList} from '@legendapp/list'
import {SafeAreaView, StatusBar, StyleSheet, Text, View} from 'react-native'
import {ChatListItemComponent} from '../components/ChatListItem'
import {chatListData} from '../mockData'
import type {ChatListItem} from '../types'

type Props = {
  onChatPress: (chatId: string) => void
}

export const ChatListScreen = ({onChatPress}: Props) => {
  const renderItem = ({item}: {item: ChatListItem}) => (
    <ChatListItemComponent item={item} onPress={onChatPress} />
  )

  const keyExtractor = (item: ChatListItem) => item.id

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Stay connected with friends 💬</Text>
      </View>

      <LegendList
        data={chatListData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
})
