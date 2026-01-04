module.exports = {
    name: 'reload',
    category: 'admin',
    async execute(message) {
      // Only allow in specific server
      if (message.guild?.id !== '1455305225081589843') return;
      
      if (message.author.id !== '758522527885951016') return;
      
      
      await message.react('🙈').catch(() => {});
    }
  };