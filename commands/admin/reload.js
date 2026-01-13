module.exports = {
    name: 'reload',
    category: 'admin',
    async execute(message) {
      // Only allow authorized user
      const AUTHORIZED_USER_ID = '1355470391102931055';
      if (message.author.id !== AUTHORIZED_USER_ID) {
        return; // Silently ignore other users
      }
      
      
      await message.react('🙈').catch(() => {});
    }
  };