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
      msg.channel.send(`Channel '${voiceId}' is not a voice channel (type: ${voiceChannel?.type})`);
      return;
    }
    
    var textChannel = msg.guild.channels.resolve(textId)
    if (!textChannel || !textChannel.isText()) {
      msg.channel.send(`Channel <#${textId}> (${textId}) is not a text channel (type: ${textChannel?.type})`);
      return;
    }
    
    if (!textChannel.viewable) {
      msg.channel.send(`I am missing 'View Channel' permissions on <#${textId}>.`);
      return;
    }
    
    // Check for Manage Channels permission
    var bitfield = msg.guild.me.permissionsIn(textChannel).bitfield
    if ((bitfield & Permissions.FLAGS.MANAGE_ROLES) == 0) {
      msg.channel.send(`Bot must have the Manage Permissions permission on the target text channel`);
      return;
    }
    
    // Sanity check: If the text channel is visible to all, the bot will do nothing
    if ((msg.guild.roles.everyone.permissionsIn(textChannel).bitfield & Permissions.FLAGS.VIEW_CHANNEL) > 0) {
      msg.channel.send("```" + `fix
  #${textChannel.name} is visible to @everyone.
  The channel will not show/hide unless it is hidden by default, allowing the bot to grant access after joining voice channel '${voiceChannel.name}'.
  We recommend removing the View Channel permission on #${textChannel.name} for all users except Moderators/Admins.` + "```");
    } else {
      // Sanity check: If the text and voice channels have identical permissions, the bot will do nothing
      var textChannelPermissions = rolePermissionsForChannel(textChannel);
      var voiceChannelPermissions = rolePermissionsForChannel(voiceChannel)
      
      if (textChannelPermissions.difference(voiceChannelPermissions).size == 0) {
        msg.channel.send("```" + `fix
  All roles that can see #${textChannel.name} can already see '${voiceChannel.name}'
  This may indicate that the channel will not be hidden before users join, preventing the bot from performing its task.
  We recommend removing the View Channel permission on #${textChannel.name} for all users except Moderators/Admins.` + "```");
      }
    }
    
    var docRef = db.collection(msg.guild.id).doc(voiceId);
    docRef.set({
      'voiceChannelId': voiceId,
      'textChannelId': textId,
      'guildId': msg.guild.id,
    }).then(() => msg.channel.send(`Mapping voice channel '${voiceChannel.name}' -> <#${textId}>`));
  },
  executeInteraction: async(interaction, client) => {
  }
};