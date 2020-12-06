
const { TelegramClient } = require('./client');
const inquirer = require('inquirer');
const yenv = require('yenv');

(async () => {
  try {
    const env = yenv('.env.yml', { env: 'default' })
    const API_KEY = env.api_hash; // 'ded83657f75bf55d9332adcb7c14b759';
    const client = new TelegramClient(API_KEY);
    await client.login();
    const groups = await client.getGroups();
    const { targetChatId } = await inquirer.prompt([
      {
        name: 'targetChatId',
        message: 'Select group for cleaning:',
        type: 'list',
        loop: false,
        choices: groups.map(g => ({ name: g.title, value: g.id }))
      }
    ]);
    console.log('Get list of all messages in chat...');
    const messages = await client.getAllMessagesFromChat(targetChatId);
    console.log(`Done. Found ${messages.length} ids`);
    const { count } = await inquirer.prompt([
      {
        name: 'count',
        message: 'How many last messages to leave?',
        type: 'number',
      },
    ]);
    const ids = messages.map(msg => msg.id);
    await client.deleteMessages(targetChatId, ids.slice(count));
    console.log('Done!');
    await client.close();
  } catch (error) {
    console.log(error);
  }
})();