const admin = require('firebase-admin');
const db = admin.firestore();

module.exports = {
  name: 'remove',
  execute(msg, args) {
    var voiceId = args[0];
    if (/<#\d{18}>/.test(voiceId)) {
      voiceId = voiceId.substring(2, 20);
    }
    
    db.collection(msg.guild.id).doc(voiceId)
      .delete()
      .then(() => msg.channel.send(`Removing channel map for '<#${voiceId}>'`));
  },
  executeInteraction: async(interaction, client) => {
    var targetChannel = interaction.options.getChannel('channel');
    var voiceId = targetChannel.id;
    db.collection(interaction.guild.id).doc(voiceId)
      .delete()
      .then(() => interaction.editReply({ content: `Removing channel map for '<#${voiceId}>'` }));
    }
};