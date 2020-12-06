
const { Client } = require('tdl')
const { TDLib } = require('tdl-tdlib-addon')

class TelegramClient {
  session = null;
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async login() {
    try {
      const connection = new Client(new TDLib('./libtdjson.so'), {
        apiId: 2314488, // Your api_id
        apiHash: this.apiKey,
        use_message_database: false
      });
      await connection.connectAndLogin();
      connection.on('error', console.error)
      this.session = connection;
    } catch (e) {
      console.error(e);
    }
  }

  async getChatList() {
    const { chat_ids } = await this.session.invoke({
      _: 'getChats',
      offset_order: '9223372036854775807',
      offset_chat_id: 0,
      limit: 1000
    });

    const chats = [];
    for (const chatId of chat_ids) {
      const chat = await this.session.invoke({
        _: 'getChat',
        chat_id: chatId,
      });
      chats.push({
        id: chat.id,
        type: chat.type._,
        title: chat.title,
        permissions: chat.permissions
      });
    }

    return chats;
  }

  async getGroups() {
    const chats = await this.getChatList();
    return chats.filter(c => ['chatTypeSupergroup', 'chatTypeBasicGroup'].includes(c.type));
  }

  async getMessages(targetChatId, count, startingFrom = 0) {
    console.log(`[getMessages]: Requested ${count} messages.`);
    const messages = [];
    while (messages.length < count) {
      const lastMessage = allMessages[allMessages.length - 1];
      const lastMessageId = lastMessage ? lastMessage.id : startingFrom;
      const history = await this.session.invoke({
        _: 'getChatHistory',
        chat_id: targetChatId,
        from_message_id: lastMessageId,
        offset: 0,
        limit: count - messages.length,
        only_local: false
      });
      console.log(`[getMessages]: Download chunk of ${history.total_count} (${history.messages.length}) messages`);
      history.messages.forEach(m => messages.push(m));
    }

    console.log(`[getMessages]: Received ${messages.length} messages.`);
    return messages;
  }

  async getAllMessagesFromChat(targetChatId) {
    const allMessages = [];
    while (true) {
      const lastMessage = allMessages[allMessages.length - 1];
      const lastMessageId = lastMessage ? lastMessage.id : 0;
      const history = await this.session.invoke({
        _: 'getChatHistory',
        chat_id: targetChatId,
        from_message_id: lastMessageId,
        offset: 0,
        limit: 1000,
        only_local: false
      });
      if (history.total_count === 0) {
        break;
      }
      console.log(`[getMessages]: Download chunk of ${history.total_count} (${history.messages.length}) messages`);
      history.messages.forEach(m => allMessages.push(m));
    }
    return allMessages;
  }

  async deleteMessages(targetChatId, messagesIds) {
    console.log(`[deleteMessages]: ${messagesIds.length} messages will be deleted`)
    let ids = messagesIds;
    let brokenChunks = [];
    while(ids.length > 0) {
      const poolSize = Math.max(Math.round(ids.length / 2, 1));
      const chunk = ids.splice(poolSize * -1, poolSize);
      console.log('chunk:', chunk)
      try {
        const result = await this.session.invoke({
          _: 'deleteMessages',
          chat_id: targetChatId,
          message_ids: ids,
          revoke: true
        });
        console.log('Deleting result:', result)

      } catch(e) {
        console.log('Deleting chunk error:', e);
        brokenChunks = brokenChunks.concat(chunk);
      }
    }
    if (brokenChunks.length > 0) {
      await this.deleteMessages(targetChatId, brokenChunks.reverse())
    }
  }

  async close() {
    await this.session.close()
  }
}


module.exports.TelegramClient = TelegramClient;