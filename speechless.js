const { Client, Structures, Permissions } = require('discord.js');
const client = new Client();
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

function printHelp(msg) {
  msg.channel.send(`== Speechless bot ==
Commands must be run by users with the Manage Channels permission.
Any users with a role giving them 'View Channel' on the text channel will be unaffected.
This can be set to a Moderator role to still moderate the channel without having to be in the voice call at the time.
Text channel will need to have permissions for regular users removed to allow the bot to show the channel to them when they join the related Voice channel.
More details available on <https://github.com/tpkelly/speechless>.

Bot itself requires:
- Server-wide permissions of Manage Channels (allow settings to be changed on channels)
- Read/Send Messages (to respond to commands)
- View Channel on any channels you intend to use this for
- Either server-wide Manage Roles, or channel-specific Manage Permissions to add/remove users from channels

# Commands:
\`/sl.help\`: Display these messages
\`/sl.add <voiceId> <textId>\`: Enable a text channel as a no-voice text channel for a voice channel
\`/sl.remove <voiceId>\`: Remove the mapping on a voice channel
\`/sl.list\`: List out all current mappings in this server
\`/sl.report\`: Send a DM to the creator of the bot about an issue or feedback`);
}

function allowUserChannelAccess(guild, channelId, userId) {
  var noVoiceChannel = guild.channels.resolve(channelId)
  var permission = {
    id: userId,
    type: 'member',
    allow: Permissions.FLAGS.VIEW_CHANNEL | Permissions.FLAGS.SEND_MESSAGES | Permissions.FLAGS.READ_MESSAGE_HISTORY,
    deny: 0
  };
  var permissions = noVoiceChannel.permissionOverwrites.set(userId, permission);

  noVoiceChannel.overwritePermissions(permissions, `Adding user to <#${channelId}>`)
    .then(() => console.log(`Adding user to <#${channelId}>`))
    .catch(function(e) { console.log(e) })
}

function removeUserChannelAccess(guild, channelId, userId) {
  var noVoiceChannel = guild.channels.resolve(channelId)
  var permissions = noVoiceChannel.permissionOverwrites;
  permissions.delete(userId);

  noVoiceChannel.overwritePermissions(permissions, `Removing user from <#${channelId}>`)
    .then(`Removing user from <#${channelId}>`)
    .catch(function(e) { console.log(e) })
}

/** Events Handlers**/

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag} @ ${new Date().toLocaleString()}!`);
  client.user.setActivity("/sl.help to get started");
});

client.on('message', msg => {
  var content = msg.content.toLowerCase();
  
  if (!content.startsWith('/sl.')) {
    return;
  }
  
  // Check for Manage Channels permission
  var bitfield = msg.channel.permissionsFor(msg.author).bitfield
  if ((bitfield & Permissions.FLAGS.MANAGE_CHANNELS) == 0) {
    msg.channel.send(`You must have the Manage Channels permission to run this command`);
    return;
  }
  
  var components = content.split(' ');
  var command = components[0];
  var guild = msg.channel.guild;
  
  if (command === '/sl.add') {
    addChannelMapping(msg, components[1], components[2], guild);
  } else if (command === '/sl.remove') {
    removeChannelMapping(msg, components[1], guild);
  } else if (command === '/sl.list') {
    listChannelMappings(msg, guild);
  } else if (command === '/sl.report') {
    var alertUser = client.users.resolve('181499334855098379');
    alertUser.createDM().then(c => c.send(`Bug report (${msg.author.tag}): ${content}`));
  } else {
    printHelp(msg);
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