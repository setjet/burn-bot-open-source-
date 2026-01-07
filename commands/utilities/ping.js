module.exports = {
  name: 'ping',
  aliases: ['p'],
  async execute(message) {
    try {
      const startTime = Date.now();
      const pingMessage = await message.reply({ 
        embeds: [{
          description: '<a:loading:1458064376165564577> **Checking ping...**',
        }],
        allowedMentions: { repliedUser: false }
      });

      const latency = Date.now() - startTime;
      const apiLatency = Math.round(message.client.ws.ping);

      await pingMessage.edit({
        embeds: [{
          color: 0x838996,
          description: `>>> **API Latency:** \`${apiLatency}ms\`\n**Bot Latency:** \`${latency}ms\``,
        }]
      });
    } catch (error) {
      console.error('Ping command error:', error);
    }
  }
};