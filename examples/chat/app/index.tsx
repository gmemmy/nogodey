import * as React from 'react'
import {StyleSheet, View} from 'react-native'
import {GestureHandlerRootView} from 'react-native-gesture-handler'
import {ChatListScreen} from '../screens/ChatListScreen'
import {ConversationScreen} from '../screens/ConversationScreen'

type NavigationState = {
  screen: 'ChatList' | 'Conversation'
  chatId?: string
}

export default function Page() {
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
        ) : (
          <ConversationScreen chatId={navigation.chatId!} onBack={handleBack} />
        )}
      </View>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
