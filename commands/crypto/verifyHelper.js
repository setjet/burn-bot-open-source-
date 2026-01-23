const { EmbedBuilder } = require('discord.js');
const { generateVerificationMessage, verifyCryptoSignature } = require('./utils');

/**
 * Helper function to handle wallet verification
 * Can be reused across all crypto commands
 */
async function handleVerification(message, args, { prefix }, userId, currency, dbHelpers) {
  if (args.length < 2) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Invalid Usage**`,
            '',
            `-# Use \`${prefix}${currency.toLowerCase()} verify <signature>\` to verify your wallet.`,
            `-# Get the signature by signing the verification message with your wallet.`
          ].join('\n'))
      ],
      allowedMentions: { repliedUser: false }
    });
  }

  const wallet = dbHelpers.getCryptoWallet(userId, currency);
  if (!wallet) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **No Wallet Set**`,
            '',
            `> You don't have a ${currency} wallet address set.`,
            '',
            `-# Use \`${prefix}${currency.toLowerCase()} set <address>\` to set your wallet first.`
          ].join('\n'))
      ],
      allowedMentions: { repliedUser: false }
    });
  }

  if (wallet.verified) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            `<:allowed:1457808577786806374> <:arrows:1457808531678957784> **Already Verified**`,
            '',
            `> Your ${currency} wallet is already verified.`
          ].join('\n'))
      ],
      allowedMentions: { repliedUser: false }
    });
  }

  const verificationInfo = dbHelpers.getVerificationMessage(userId, currency);
  if (!verificationInfo) {
    // Generate new verification message
    const newMessage = generateVerificationMessage(userId, currency, wallet.address);
    const timestamp = Date.now();
    dbHelpers.setVerificationMessage(userId, currency, newMessage, timestamp);
    
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            `<:arrows:1457808531678957784> **New Verification Message**`,
            '',
            `> Your previous verification message expired.`,
            `> Please sign this new message:`,
            '',
            `\`\`\`${newMessage}\`\`\``,
            '',
            `-# Use \`${prefix}${currency.toLowerCase()} verify <signature>\` after signing.`
          ].join('\n'))
      ],
      allowedMentions: { repliedUser: false }
    });
  }

  const signature = args.slice(1).join(' '); // Handle signatures that might have spaces
  
  try {
    const isValid = verifyCryptoSignature(currency, verificationInfo.message, signature, wallet.address);
    
    if (isValid) {
      // Mark wallet as verified
      dbHelpers.setCryptoWallet(userId, currency, wallet.address, true, null, verificationInfo.message, verificationInfo.timestamp);
      
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              `<:allowed:1457808577786806374> <:arrows:1457808531678957784> **Wallet Verified!**`,
              '',
              `> Your ${currency} wallet has been successfully verified!`,
              `> Address: \`${wallet.address}\``,
              '',
              `-# Your wallet is now marked as verified on the leaderboard.`
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    } else {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Verification Failed**`,
              '',
              `> The signature does not match your wallet address.`,
              '',
              `-# Make sure you signed the correct message:`,
              `\`\`\`${verificationInfo.message}\`\`\``,
              '',
              `-# And that you're using the correct wallet address.`
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }
  } catch (error) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Verification Error**`,
            '',
            `> An error occurred during verification: ${error.message}`,
            '',
            `-# Please try again or contact support if the issue persists.`
          ].join('\n'))
      ],
      allowedMentions: { repliedUser: false }
    });
  }
}

module.exports = { handleVerification };

