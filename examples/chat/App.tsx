import {StatusBar} from 'expo-status-bar'
import * as React from 'react'
import {StyleSheet, View} from 'react-native'
import {GestureHandlerRootView} from 'react-native-gesture-handler'
import {ChatListScreen} from './screens/ChatListScreen'
import {ConversationScreen} from './screens/ConversationScreen'

type NavigationState = {
  screen: 'ChatList' | 'Conversation'
  chatId?: string
}

export default function App() {
  const [navigation, setNavigation] = React.useState<NavigationState>({
    screen: 'ChatList',
  })

  const handleChatPress = (chatId: string) => {
    setNavigation({
      screen: 'Conversation',
      chatId,
    })
  }

  const handleBack = () => {
    setNavigation({
      screen: 'ChatList',
    })
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        {navigation.screen === 'ChatList' ? (
          <ChatListScreen onChatPress={handleChatPress} />
        ) : navigation.screen === 'Conversation' && navigation.chatId ? (
          <ConversationScreen chatId={navigation.chatId} onBack={handleBack} />
        ) : (
          <ChatListScreen onChatPress={handleChatPress} />
        )}
        <StatusBar style="dark" />
      </View>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
