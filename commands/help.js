const helpMessage = `== Speechless bot ==
Commands must be run by users with the Manage Channels permission.
Any users with a role giving them 'View Channel' on the text channel will be unaffected.
This can be set to a Moderator role to still moderate the channel without having to be in the voice call at the time.
Text channel will need to have permissions for regular users removed to allow the bot to show the channel to them when they join the related Voice channel.

Bot itself requires:
- Read/Send Messages (to respond to commands)
- View Channel on any channels you intend to use this for
- Either server-wide Manage Roles, or channel-specific Manage Permissions to add/remove users from channels

# Commands:
\`/sl.help\`: Display these messages
\`/sl.add <voiceId> <textId>\`: Enable a text channel as a no-voice text channel for a voice channel
\`/sl.remove <voiceId>\`: Remove the mapping on a voice channel
\`/sl.list\`: List out all current mappings in this server
\`/sl.support\`: Display support information`;

module.exports = {
  name: 'help',
  execute(msg, args) {
    msg.channel.send(helpMessage);
  },
  executeInteraction: async(interaction, client) => {
    interaction.editReply({ content: helpMessage });
  }
};