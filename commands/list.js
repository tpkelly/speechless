const admin = require('firebase-admin');
const db = admin.firestore();

async function printList(guildId, replyFunc) {
    return await db.collection(guildId)
      .listDocuments()
      .then(async docs => {
        if (docs.length == 0) {
          return 'No channel mappings configured';
        }
        
        var message = '__**Currently mapped channels**__';
        for (var doc of docs) {
           await doc.get().then(d => {
            var voiceChannelId = d.get('voiceChannelId');
            var textChannelId = d.get('textChannelId');
            var readonly = d.get('readonly') ? '(readonly)' : '';
            message += `\n🔊 <#${voiceChannelId}>: <#${textChannelId}> ${readonly}`;
          })
        }
        
        return message;
      });

}


module.exports = {
  name: 'list',
  execute: async (msg, args) => {
    msg.channel.send(await printList(msg.guild.id));
  },
  executeInteraction: async (interaction, client) => {
    interaction.editReply(await printList(interaction.guild.id));
  }
};