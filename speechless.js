const { Client, Collection, Intents } = require('discord.js');
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES],
  partials: ['MESSAGE', 'CHANNEL']
});
const auth = require('./auth.speechless.json');
const admin = require('firebase-admin');
const fs = require('fs');

admin.initializeApp({
  credential: admin.credential.cert(auth.firebase)
});

client.on('ready', () => {
  client.user.setActivity("/sl.help to get started");
  
  // Register commands
  client.commands = new Collection();
  const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
  }
  
  // Register event handlers
  client.events = new Collection();
  const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
  
  for (const file of eventFiles) {
    const eventLogic = require(`./events/${file}`);
    client.events.set(eventLogic.name, eventLogic);
  }
  
  client.on('interactionCreate', (interaction) => client.events.get('interactionCreate').execute(interaction, client));
  client.on('messageCreate', (message) => client.events.get('messageCreate').execute(message, client));
  client.on('voiceStateUpdate', client.events.get('voiceStateUpdate').execute);

  console.log(`Logged in as ${client.user.tag} @ ${new Date().toLocaleString()}!`);
});

client.login(auth.discord);