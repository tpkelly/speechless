const admin = require('firebase-admin');
const db = admin.firestore();

module.exports = {
  name: 'list',
  execute(msg, args) {
    db.collection(msg.guild.id)
      .listDocuments()
      .then(docs => {
        if (docs.length == 0) {
          msg.channel.send('No channel mappings configured');
          return
        }
        
        msg.channel.send( '__**Currently mapped channels**__');
        docs.forEach(doc => {
          doc.get().then(d => {
            var voiceChannelId = d.get('voiceChannelId');
            var textChannelId = d.get('textChannelId');
            msg.channel.send(`🔊 <#${voiceChannelId}>: <#${textChannelId}>`)
          })
        })
      });
  },
  executeInteraction: async(interaction, client) => {
    db.collection(interaction.guild.id)
      .listDocuments()
      .then(docs => {
        if (docs.length == 0) {
          interaction.editReply('No channel mappings configured');
          return;
        }
        
        interaction.editReply({ content: '__**Currently mapped channels**__' });
        docs.forEach(doc => {
          doc.get().then(d => {
            var voiceChannelId = d.get('voiceChannelId');
            var textChannelId = d.get('textChannelId');
            interaction.channel.send(`🔊 <#${voiceChannelId}>: <#${textChannelId}>`)
          })
        })
      });
  }
};