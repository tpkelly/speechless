const { Client, Collection, Intents, Permissions } = require('discord.js');
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

const db = admin.firestore();

/** Commands **/

function rolePermissionsForChannel(channel) {
  return channel
    .permissionOverwrites
    .filter(p => p.type == 'role')
    // Map to ID to bool of "Role ID => can view channel"
    .mapValues(p => (p.allow.bitfield & Permissions.FLAGS.VIEW_CHANNEL) > 0)
    .filter(p => p == true)
}

function addChannelMapping(msg, voiceId, textId, guild) {
  if (/<#\d{18}>/.test(textId)) {
    textId = textId.substring(2, 20);
  }

  if (!voiceId || !textId || !parseInt(voiceId) || !parseInt(textId)) {
    msg.channel.send("Expected format: ``/sl.add <voiceChannelId> <textChannelId>``");
    return;
  }
  
  var voiceChannel = guild.channels.resolve(voiceId)
  if (!voiceChannel || voiceChannel.type !== 'voice') {
    msg.channel.send(`Channel '${voiceId}' is not a voice channel (type: ${voiceChannel?.type})`);
    return;
  }
  
  var textChannel = guild.channels.resolve(textId)
  if (!textChannel || textChannel.type !== 'text') {
    msg.channel.send(`Channel <#${textId}> (${textId}) is not a text channel (type: ${textChannel?.type})`);
    return;
  }
  
  if (!textChannel.viewable) {
    msg.channel.send(`I am missing 'View Channel' permissions on <#${textId}>.`);
    return;
  }
  
  // Check for Manage Channels permission
  var bitfield = textChannel.permissionsFor(client.user).bitfield
  if ((bitfield & Permissions.FLAGS.MANAGE_ROLES) == 0) {
    msg.channel.send(`Bot must have the Manage Permissions permission on the target text channel`);
    return;
  }
  
  // Sanity check: If the text channel is visible to all, the bot will do nothing
  if ((textChannel.permissionsFor(guild.roles.everyone) & Permissions.FLAGS.VIEW_CHANNEL) > 0) {
    msg.channel.send("```" + `fix
#${textChannel.name} is visible to @everyone.
The channel will not show/hide unless it is hidden by default, allowing the bot to grant access after joining voice channel '${voiceChannel.name}'.
We recommend removing the View Channel permission on #${textChannel.name} for all users except Moderators/Admins.` + "```");
  } else {
    // Sanity check: If the text and voice channels have identical permissions, the bot will do nothing
    var textChannelPermissions = rolePermissionsForChannel(textChannel);
    var voiceChannelPermissions = rolePermissionsForChannel(voiceChannel)
    
    if (textChannelPermissions.difference(voiceChannelPermissions).array().length == 0) {
      msg.channel.send("```" + `fix
All roles that can see #${textChannel.name} can already see '${voiceChannel.name}'
This may indicate that the channel will not be hidden before users join, preventing the bot from performing its task.
We recommend removing the View Channel permission on #${textChannel.name} for all users except Moderators/Admins.` + "```");
    }
  }
  
  var docRef = db.collection(guild.id).doc(voiceId);
  docRef.set({
    'voiceChannelId': voiceId,
    'textChannelId': textId,
    'guildId': guild.id,
  }).then(() => msg.channel.send(`Mapping voice channel '${voiceChannel.name}' -> <#${textId}>`));
}

/** Events Handlers**/

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