const { Permissions } = require('discord.js');

function printSupport(guild, targetChannel, prefix) {
  var supportMessage = `== Speechless support ==
Commands must be run by users with the Manage Channels permission.
Any users with a role giving them 'View Channel' on the text channel will be unaffected.
This can be set to a Moderator role to still moderate the channel without having to be in the voice call at the time.
Text channel will need to have permissions for regular users removed to allow the bot to show the channel to them when they join the related Voice channel.

**Support**: <https://discord.gg/yb287x2ZnW>
**Github**:  <https://github.com/tpkelly/speechless>

Bot Permissions Check:`;

  if (targetChannel) {
    var textChannelPermissions = guild.me.permissionsIn(targetChannel).bitfield;
    
    var hasReadMessages = (textChannelPermissions & Permissions.FLAGS.VIEW_CHANNEL) > 0;
    var hasSendMessages = guild.me.permissions.has(Permissions.FLAGS.SEND_MESSAGES);
    var hasManagePermissions = (textChannelPermissions & Permissions.FLAGS.MANAGE_ROLES) > 0;
    var hasManageChannels = (textChannelPermissions & Permissions.FLAGS.MANAGE_CHANNELS) > 0;
    
    supportMessage += `
${hasReadMessages ? ':white_check_mark:' : ':no_entry_sign:'} Read Messages (Channel)
${hasSendMessages ? ':white_check_mark:' : ':no_entry_sign:'} Send Messages (Server)
${hasManagePermissions ? ':white_check_mark:' : ':no_entry_sign:'} Manage Permissions (Channel)
${hasManageChannels ? ':white_check_mark:' : ':no_entry_sign:'} Manage Channels (Server)`;
  }
  else {
    var hasSendMessages = guild.me.permissions.has(Permissions.FLAGS.SEND_MESSAGES);
    var hasManagePermissions = guild.me.permissions.has(Permissions.FLAGS.MANAGE_ROLES);
    
        supportMessage += `
${hasSendMessages ? ':white_check_mark:' : ':no_entry_sign:'} Send Messages (Server)
${hasManagePermissions ? ':white_check_mark:' : ':no_entry_sign:'} Manage Roles (Server)
${hasManageChannels ? ':white_check_mark:' : ':no_entry_sign:'} Manage Channels (Server)

To check a specific channel, again with /${prefix}support <channel>`;
  }

  return supportMessage;
}

module.exports = {
  name: 'support',
  execute(msg, args) {
    var textChannel;
    if (args[0])
    {
      var targetChannel = args[0];
      if (/<#\d{18}>/.test(targetChannel)) {
        targetChannel = targetChannel.substring(2, 20);
      }
      
      textChannel = msg.guild.channels.resolve(targetChannel)
    }
    
    msg.channel.send(printSupport(msg.guild, textChannel, 'sl.'));
  },
  executeInteraction: async(interaction, client) => {
    var targetChannel = interaction.options.getChannel('targetchannel');
    interaction.editReply({ content: printSupport(interaction.guild, targetChannel, '') });
  }
};