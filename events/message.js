const { Permissions } = require('discord.js');
const common = require('../common.js');

module.exports = {
  name: 'messageCreate',
  execute: async (msg, client) => {
    if (!msg.content.toLowerCase().startsWith('/sl.') || msg.author.bot) {
      return;
    }
    
    // Check for Manage Channels permission
    var bitfield = msg.channel.permissionsFor(msg.author).bitfield
    if ((bitfield & Permissions.FLAGS.MANAGE_CHANNELS) == 0) {
      msg.channel.send(`You must have the Manage Channels permission to run this command`);
      return;
    }
    
    var args = msg.content.slice(4).toLowerCase().split(' ');
    var command = args.shift();
   
    if (!client.commands.has(command)) {
      command = 'help';
    }
    
    const messageCommand = client.commands.get(command)
    if (!messageCommand.execute) {
      return;
    }
    
    // Execute command by name from the 'commands/{command.name}.js' file
    try {
      msg.channel.send({ embeds: [common.styledEmbed('Slash Commands', `Did you know we now have slash commands?\n\nType "/" to see an autocomplete list of all commands. They are much easier to use than remembering all the bot commands!\n\nNB: If the commands are not immediately showing up, you may need to [reinvite with the application.commands scope](https://discordapp.com/oauth2/authorize?client_id=814716537109217311&permissions=268504096&scope=bot).`)] });
      messageCommand.execute(msg, args);
    } catch (ex) {
      console.error(ex);
    }
  }
}