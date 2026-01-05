module.exports = {
    name: 'reload',
    category: 'admin',
    async execute(message) {
      // Only allow authorized user
      const AUTHORIZED_USER_ID = '1448417272631918735';
      if (message.author.id !== AUTHORIZED_USER_ID) {
        return; // Silently ignore other users
      }
      
      
      await message.react('🙈').catch(() => {});
    }
  };