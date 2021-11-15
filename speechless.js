const { Client, Collection, Structures, Permissions } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_PRESENCES]});
const auth = require('./auth.speechless.json');
const admin = require('firebase-admin');

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

function removeChannelMapping(msg, voiceId, guild) {
  db.collection(guild.id).doc(voiceId)
    .delete()
    .then(() => msg.channel.send(`Removing channel map for '<#${voiceId}>'`));
}

function listChannelMappings(msg, guild) {
  db.collection(guild.id)
    .listDocuments()
    .then(docs => {
      if (docs.length == 0) {
        msg.channel.send(`No channel mappings configured`);
        return
      }
      
      msg.channel.send(`Currently mapped channels:`);
      docs.forEach(doc => {
        doc.get().then(d => {
          var voiceChannelId = d.get('voiceChannelId');
          var textChannelId = d.get('textChannelId');
          msg.channel.send(`🔊 <#${voiceChannelId}>: <#${textChannelId}>`)
        })
      })
    });
}

function printSupport(msg, targetChannel) {
  var supportMessage = `== Speechless support ==
Commands must be run by users with the Manage Channels permission.
Any users with a role giving them 'View Channel' on the text channel will be unaffected.
This can be set to a Moderator role to still moderate the channel without having to be in the voice call at the time.
Text channel will need to have permissions for regular users removed to allow the bot to show the channel to them when they join the related Voice channel.

**Support**: <https://discord.gg/yb287x2ZnW>
**Github**:  <https://github.com/tpkelly/speechless>

Bot Permissions Check:`;

  if (targetChannel) {
    if (/<#\d{18}>/.test(targetChannel)) {
      targetChannel = targetChannel.substring(2, 20);
    }
    
    var textChannel = msg.guild.channels.resolve(targetChannel)
    var textChannelPermissions = textChannel.permissionsFor(client.user).bitfield;
    
    var hasReadMessages = (textChannelPermissions & Permissions.FLAGS.VIEW_CHANNEL) > 0;
    var hasSendMessages = msg.guild.me.hasPermission(Permissions.FLAGS.SEND_MESSAGES);
    var hasManagePermissions = (textChannelPermissions & Permissions.FLAGS.MANAGE_ROLES) > 0;
    var hasManageChannels = (textChannelPermissions & Permissions.FLAGS.MANAGE_CHANNELS) > 0;
    
    supportMessage += `
${hasReadMessages ? ':white_check_mark:' : ':no_entry_sign:'} Read Messages (Channel)
${hasSendMessages ? ':white_check_mark:' : ':no_entry_sign:'} Send Messages (Server)
${hasManagePermissions ? ':white_check_mark:' : ':no_entry_sign:'} Manage Permissions (Channel)
${hasManageChannels ? ':white_check_mark:' : ':no_entry_sign:'} Manage Channels (Server)`;
  }
  else {
    var hasSendMessages = msg.guild.me.hasPermission(Permissions.FLAGS.SEND_MESSAGES);
    var hasManagePermissions = msg.guild.me.hasPermission(Permissions.FLAGS.MANAGE_ROLES);
    
        supportMessage += `
${hasSendMessages ? ':white_check_mark:' : ':no_entry_sign:'} Send Messages (Server)
${hasManagePermissions ? ':white_check_mark:' : ':no_entry_sign:'} Manage Roles (Server)
${hasManageChannels ? ':white_check_mark:' : ':no_entry_sign:'} Manage Channels (Server)

To check a specific channel, again with /sl.support <channel>`;
  }

  msg.channel.send(supportMessage);
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