function noSuchCommand(client, interaction) {
  interaction.editReply({ content: 'No such command', ephemeral: true })
    .catch(err => console.log(err));
}

module.exports = {
  name: 'interactionCreate',
  execute: async (interaction, client) => {
    // Not a slash command
    if (!interaction.isCommand()) {
      return;
    }
    
    var command = interaction.commandName;
    var response = '';
    var embed;

    if (!client.commands.has(command)) {
      noSuchCommand(client, interaction);
      return;
    }

    const clientCommand = client.commands.get(command);
    if (!clientCommand.executeInteraction) {
      noSuchCommand(client, interaction);
      return;
    }

    await interaction.deferReply({ ephemeral: clientCommand.ephemeral })
   
    // Execute command by name from the 'commands/{command.name}.js' file
    try {
      clientCommand.executeInteraction(interaction, client);
    } catch (ex) {
      console.error(ex);
      interaction.editReply(ex);
    }
  }
}