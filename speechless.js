const { Client, Structures } = require('discord.js');
const client = new Client();
const auth = require('./auth.speechless.json');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(auth.firebase)
});

const db = admin.firestore();

var sqlCommands = {
  channels: {}
}

function messageIsSelf(msg) {
  return msg.author.id == client.user.id
}

function addChannelMapping(msg, voiceId, textId, guild) {
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
  if ((bitfield & 0x10000000) == 0) {
    msg.channel.send(`Bot must have the Manage Permissions permission on the target text channel`);
    return;
  }
  
  var docRef = db.collection(guild.id).doc(voiceId);
  docRef.set({
    'voiceChannelId': voiceId,
    'textChannelId': textId,
    'guildId': guild.id,
  }).then(() => msg.channel.send(`Mapping channel ${voiceId} -> ${textId}`));
}

function removeChannelMapping(msg, voiceId, textId, guild) {
  db.collection(guild.id).doc(voiceId)
    .delete()
    .then(() => msg.channel.send(`Unmapping channel ${voiceId} -> ${textId}`));
}

function printHelp(msg) {
  msg.channel.send(`== Speechless bot ==
Commands must be run by users with the Manage Channels permission.
Bot itself requires:
- Server-wide permissions of Manage Channels (allow settings to be changed on channels)
- Read/Send Messages (to respond to commands)
- View Channel on any channels you intend to use this for
- Either server-wide Manage Roles, or channel-specific Manage Permissions to add/remove users from channels

# Commands:
\`/sl.help\`: Display these messages
\`/sl.add <voiceId> <textId>\`: Enable a text channel as a no-voice text channel for a voice channel
\`/sl.remove <voiceId> <textId>\`: Remove the mapping between a no-voice text channel and a voice channel
\`/sl.report\`: Send a DM to the creator of the bot about an issue or feedback`);
}

function allowUserChannelAccess(guild, channelId, userId) {
  var noVoiceChannel = guild.channels.resolve(channelId)
  var permission = {
    id: userId,
    type: 'member',
    allow: 0x400 | 0x800 | 0x10000, // VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY
    deny: 0
  };
  var permissions = noVoiceChannel.permissionOverwrites.set(userId, permission);

  noVoiceChannel.overwritePermissions(permissions, `Adding user to ${noVoiceChannel.name} channel`)
    .then(() => console.log(`Adding user to #${noVoiceChannel.name} channel`))
    .catch(function(e) { console.log(e) })
}

function removeUserChannelAccess(guild, channelId, userId) {
  var noVoiceChannel = guild.channels.resolve(channelId)
  var permissions = noVoiceChannel.permissionOverwrites;
  permissions.delete(userId);

  noVoiceChannel.overwritePermissions(permissions, `Removing user from ${noVoiceChannel.name} channel`)
    .then(`Removing user from #${noVoiceChannel.name} channel`)
    .catch(function(e) { console.log(e) })
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag} @ ${new Date().toLocaleString()}!`);
  client.user.setActivity("");
});

client.on('message', msg => {
  var content = msg.content.toLowerCase();
  
  if (!content.startsWith('/sl.')) {
    return;
  }
  
  // Check for Manage Channels permission
  var bitfield = msg.channel.permissionsFor(msg.author).bitfield
  if ((bitfield & 0x10) == 0) {
    msg.channel.send(`You must have the Manage Channels permission to run this command`);
    return;
  }
  
  var components = content.split(' ');
  var command = components[0];
  var guild = msg.channel.guild;
  
  if (command === '/sl.add') {
    addChannelMapping(msg, components[1], components[2], guild);
  } else if (command === '/sl.remove') {
    removeChannelMapping(msg, components[1], components[2], guild);
  } else if (command === '/sl.help') {
    printHelp(msg);
  } else if (command === '/sl.report') {
    var alertUser = client.users.resolve('181499334855098379');
    alertUser.createDM().then(c => c.send(`Bug report (${msg.author.tag}): ${content}`));
  }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  // Unrelated activity
  if (oldState.channelID == newState.channelID) {
    return;
  }

  // Member left voice channel
  if (oldState.channelID) {
    console.log(`Leaving channel ${oldState.channelID}`)
    var noVoiceChannelId = await db.collection(newState.guild.id).doc(oldState.channelID).get();
    if (noVoiceChannelId.exists) {
      var data = noVoiceChannelId.data()
      removeUserChannelAccess(oldState.guild, data.textChannelId, oldState.id)
    }
  }
  
  // Member joined voice channel
  if (newState.channelID) {
    console.log(`Joining channel ${newState.channelID}`)
    var noVoiceChannelId = await db.collection(newState.guild.id).doc(newState.channelID).get();
    if (noVoiceChannelId.exists) {
      var data = noVoiceChannelId.data()
      allowUserChannelAccess(newState.guild, data.textChannelId, newState.id)
    }
  }
});

client.login(auth.discord);