const { Permissions } = require('discord.js');
const admin = require('firebase-admin');
const db = admin.firestore();

function allowUserChannelAccess(guild, channelId, userId) {
  var noVoiceChannel = guild.channels.resolve(noVoiceChannelId)
  var permission = {
    'VIEW_CHANNEL': true,
    'SEND_MESSAGES': true,
    'READ_MESSAGE_HISTORY': true
  };

  noVoiceChannel.permissionOverwrites.edit(userId, permission, { reason: `Adding user to ${noVoiceChannel.name} channel` })
    .catch(function(e) { console.log(e) })
}

function removeUserChannelAccess(guild, channelId, userId) {
  var noVoiceChannel = guild.channels.resolve(channelId)
  var permissions = noVoiceChannel.permissionOverwrites;
  permissions.delete(userId);

  noVoiceChannel.permissionOverwrites.delete(userId, `Removing user from ${noVoiceChannel.name} channel`)
    .catch(function(e) { console.log(e) })
}

module.exports = {
  name: 'voiceStateUpdate',
  execute: async (oldState, newState) => {
    // Unrelated activity
    if (oldState.channelId == newState.channelId) {
      return;
    }
    
    if (oldState.channelId) {
      console.log(`Leaving channel ${oldState.channelId}`)
      var noVoiceChannelId = await db.collection(newState.guild.id).doc(oldState.channelId).get();
      if (noVoiceChannelId.exists) {
        var data = noVoiceChannelId.data()
        removeUserChannelAccess(oldState.guild, data.textChannelId, oldState.id)
      }
    }
    
    if (newState.channelId) {
      console.log(`Joining channel ${newState.channelId}`)
      var noVoiceChannelId = await db.collection(newState.guild.id).doc(newState.channelId).get();
      if (noVoiceChannelId.exists) {
        var data = noVoiceChannelId.data()
        allowUserChannelAccess(newState.guild, data.textChannelId, newState.id)
      }
    }
  }
}