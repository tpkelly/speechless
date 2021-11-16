const { Permissions } = require('discord.js');

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
    //var guild = msg.channel.guild;
   
    if (!client.commands.has(command)) {
      command = 'help';
    }
    
    const messageCommand = client.commands.get(command)
    if (!messageCommand.execute) {
      return;
    }
    
    // Execute command by name from the 'commands/{command.name}.js' file
    try {
      msg.channel.send(`**Did you know we now have slash commands? Type "/" to see an autocomplete list of all commands. They are much easier to use than remembering all the bot commands!**`)
      messageCommand.execute(msg, args);
    } catch (ex) {
      console.error(ex);
    }
    
    /*
    if (command === '/sl.add') {
      addChannelMapping(msg, components[1], components[2], guild);
    } else if (command === '/sl.remove') {
      removeChannelMapping(msg, components[1], guild);
    } else if (command === '/sl.list') {
      listChannelMappings(msg, guild);
    } else if (command === '/sl.support') {
      printSupport(msg, components[1])
    } else {
      printHelp(msg);
    }
    */
  }
}