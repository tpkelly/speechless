const { Permissions } = require('discord.js');
const admin = require('firebase-admin');
const db = admin.firestore();

function rolePermissionsForChannel(channel) {
  return channel
    .permissionOverwrites
    .cache
    .filter(p => p.type == 'role')
    // Map to ID to bool of "Role ID => can view channel"
    .mapValues(p => (p.allow.bitfield & Permissions.FLAGS.VIEW_CHANNEL) > 0)
    .filter(p => p == true)
}

function mapChannels(voiceChannel, textChannel, messageChannel, isReadonly, replyFunc) {
  if (!textChannel.viewable) {
    replyFunc(`I am missing 'View Channel' permissions on <#${textChannel.id}>.`);
    return;
  }
  
  // Check for Manage Channels permission
  var bitfield = textChannel.guild.me.permissionsIn(textChannel).bitfield
  if ((bitfield & Permissions.FLAGS.MANAGE_ROLES) == 0) {
    replyFunc(`Bot must have the Manage Permissions permission on the target text channel`);
    return;
  }
  
  // Sanity check: If the text channel is visible to all, the bot will do nothing
  if ((voiceChannel.guild.roles.everyone.permissionsIn(textChannel).bitfield & Permissions.FLAGS.VIEW_CHANNEL) > 0) {
    messageChannel.send("```" + `fix
#${textChannel.name} is visible to @everyone.
The channel will not show/hide unless it is hidden by default, allowing the bot to grant access after joining voice channel '${voiceChannel.name}'.
We recommend removing the View Channel permission on #${textChannel.name} for all users except Moderators/Admins.` + "```");
  } else {
    // Sanity check: If the text and voice channels have identical permissions, the bot will do nothing
    var textChannelPermissions = rolePermissionsForChannel(textChannel);
    var voiceChannelPermissions = rolePermissionsForChannel(voiceChannel)
    
    if (textChannelPermissions.difference(voiceChannelPermissions).size == 0) {
      messageChannel.send("```" + `fix
All roles that can see #${textChannel.name} can already see '${voiceChannel.name}'
This may indicate that the channel will not be hidden before users join, preventing the bot from performing its task.
We recommend removing the View Channel permission on #${textChannel.name} for all users except Moderators/Admins.` + "```");
    }
  }
  
  var docToAdd = {
    'voiceChannelId': voiceChannel.id,
    'textChannelId': textChannel.id,
    'guildId': voiceChannel.guild.id,
  };
  
  if (isReadonly) {
    docToAdd['readonly'] = true;
  }
  
  var docRef = db.collection(voiceChannel.guild.id).doc(voiceChannel.id);
  docRef.set(docToAdd).then(() => replyFunc(`Mapping ${isReadonly ? 'readonly ' : ''}voice channel <#${voiceChannel.id}> -> <#${textChannel.id}>`));
}

module.exports = {
  name: 'add',
  execute(msg, args) {
    var voiceId = args[0];
    var textId = args[1];
    if (/<#\d{18}>/.test(textId)) {
      textId = textId.substring(2, 20);
    }

    if (!voiceId || !textId || !parseInt(voiceId) || !parseInt(textId)) {
      msg.channel.send("Expected format: ``/sl.add <voiceChannelId> <textChannelId>``");
      return;
    }
    
    var voiceChannel = msg.guild.channels.resolve(voiceId)
    if (!voiceChannel || !voiceChannel.isVoice()) {
      msg.channel.send(`Channel <#${voiceId}> is not a voice channel (type: ${voiceChannel?.type})`);
      return;
    }
    
    var textChannel = msg.guild.channels.resolve(textId)
    if (!textChannel || !textChannel.isText()) {
      msg.channel.send(`Channel <#${textId}> (${textId}) is not a text channel (type: ${textChannel?.type})`);
      return;
    }
   
    mapChannels(voiceChannel, textChannel, msg.channel, false, msg.channel.send);
  },
  executeInteraction: async(interaction, client) => {
    var voiceChannel = interaction.options.getChannel('voice');
    var textChannel = interaction.options.getChannel('text');
    var isReadonly = interaction.options.getBoolean('readonly');
    
    mapChannels(voiceChannel, textChannel, interaction.channel, isReadonly, msg => interaction.editReply({ content: msg }));
  }
};