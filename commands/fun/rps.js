const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// button collectors expiring mid-game was my villain arc 😭

const CHOICES = ['rock', 'paper', 'scissors'];
const EMOJI = { rock: '🪨', paper: '📄', scissors: '✂️' };

function getResult(choice1, choice2) {
  if (choice1 === choice2) return 'tie';
  if (
    (choice1 === 'rock' && choice2 === 'scissors') ||
    (choice1 === 'paper' && choice2 === 'rock') ||
    (choice1 === 'scissors' && choice2 === 'paper')
  ) return 'win';
  return 'lose';
}

const RPS_PREFIX = 'rps-';

// PvP: messageId -> { player1Id, player2Id, choice1, choice2 }
const pvpGames = new Map();
// Vs bot: messageId -> { authorId } — only the author can click
const botGames = new Map();

function buildRpsButtons() {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder().setCustomId(`${RPS_PREFIX}rock`).setLabel('Rock').setEmoji('🪨').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`${RPS_PREFIX}paper`).setLabel('Paper').setEmoji('📄').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`${RPS_PREFIX}scissors`).setLabel('Scissors').setEmoji('✂️').setStyle(ButtonStyle.Success)
    );
}

module.exports = {
  name: 'rps',
  aliases: ['rockpaperscissors', 'rockpaperscissor'],
  category: 'fun',
  description: 'Play Rock Paper Scissors vs the bot or challenge a user.',
  async execute(message, args, { prefix, getUser }) {
    const targetInput = args[0];
    if (targetInput) {
      const target = await getUser(message, targetInput);
      if (!target) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User not found.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }
      if (target.bot) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot challenge a **bot**. Use `,rps` to play vs the bot.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }
      if (target.id === message.author.id) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot challenge **yourself**.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('<:arrows:1457808531678957784> Rock Paper Scissors — PvP')
        .setDescription([
          `<:leese:1457834970486800567> **Player 1:** <@${message.author.id}>`,
          `<:tree:1457808523986731008> **Player 2:** <@${target.id}>`,
          '',
          '-# Both players: choose your move below.'
        ].join('\n'))
        .setFooter({ text: `${message.author.tag} vs ${target.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

      const sent = await message.reply({
        embeds: [embed],
        components: [buildRpsButtons()],
        allowedMentions: { repliedUser: false }
      });
      pvpGames.set(sent.id, {
        player1Id: message.author.id,
        player2Id: target.id,
        choice1: null,
        choice2: null
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setTitle('<:arrows:1457808531678957784> Rock Paper Scissors')
      .setDescription([
        '<:leese:1457834970486800567> Choose your move below.',
        '-# <:tree:1457808523986731008> Play against the bot.'
      ].join('\n'))
      .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

    const sent = await message.reply({
      embeds: [embed],
      components: [buildRpsButtons()],
      allowedMentions: { repliedUser: false }
    });
    botGames.set(sent.id, { authorId: message.author.id });
  },

  setup(client) {
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton() || !interaction.customId.startsWith(RPS_PREFIX)) return;
      const choice = interaction.customId.slice(RPS_PREFIX.length);
      if (!CHOICES.includes(choice)) return;

      const msgId = interaction.message.id;
      const game = pvpGames.get(msgId);

      if (game) {
        const { player1Id, player2Id } = game;
        const isPlayer1 = interaction.user.id === player1Id;
        const isPlayer2 = interaction.user.id === player2Id;
        if (!isPlayer1 && !isPlayer2) {
          return interaction.reply({
            content: '<:disallowed:1457808577786806375> Only the two players in this game can choose a move.',
            ephemeral: true
          }).catch(() => {});
        }
        if (isPlayer1 && game.choice1 !== null) {
          return interaction.reply({
            content: '<:disallowed:1457808577786806375> You already chose! Waiting for the other player.',
            ephemeral: true
          }).catch(() => {});
        }
        if (isPlayer2 && game.choice2 !== null) {
          return interaction.reply({
            content: '<:disallowed:1457808577786806375> You already chose! Waiting for the other player.',
            ephemeral: true
          }).catch(() => {});
        }
        if (isPlayer1) game.choice1 = choice;
        else game.choice2 = choice;
        await interaction.reply({ content: `You chose **${choice}** ${EMOJI[choice]}!`, ephemeral: true }).catch(() => {});

        if (game.choice1 === null || game.choice2 === null) return;

        pvpGames.delete(msgId);
        const result = getResult(game.choice1, game.choice2);
        const resultText = result === 'win' ? '<@' + player1Id + '> wins!' : result === 'lose' ? '<@' + player2Id + '> wins!' : "It's a tie!";
        const embed = new EmbedBuilder()
          .setColor(result === 'tie' ? '#838996' : '#838996')
          .setTitle('<:arrows:1457808531678957784> Rock Paper Scissors — PvP')
          .setDescription([
            `<:leese:1457834970486800567> ${EMOJI[game.choice1]} **<@${player1Id}>:** ${game.choice1}`,
            `<:tree:1457808523986731008> ${EMOJI[game.choice2]} **<@${player2Id}>:** ${game.choice2}`,
            '',
            `-# **${resultText}**`
          ].join('\n'))
          .setFooter({ text: 'Game over', iconURL: interaction.message.author?.displayAvatarURL?.({ dynamic: true }) });
        await interaction.message.edit({ embeds: [embed], components: [] }).catch(() => {});
        return;
      }

      const botGame = botGames.get(msgId);
      if (botGame) {
        if (interaction.user.id !== botGame.authorId) {
          return interaction.reply({
            content: '<:disallowed:1457808577786806375> Only the person who started this game can play. Run `,rps` to start your own.',
            ephemeral: true
          }).catch(() => {});
        }
        botGames.delete(msgId);
      } else {
        return interaction.reply({
          content: '<:disallowed:1457808577786806375> This game has expired or already ended. Run `,rps` to start a new one.',
          ephemeral: true
        }).catch(() => {});
      }

      const botChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)];
      const result = getResult(choice, botChoice);
      const resultText = result === 'win' ? 'You win!' : result === 'lose' ? 'You lose!' : "It's a tie!";
      const embed = new EmbedBuilder()
        .setColor(result === 'win' ? '#838996' : result === 'lose' ? '#838996' : '#838996')
        .setTitle('<:arrows:1457808531678957784> Rock Paper Scissors')
        .setDescription([
          `<:leese:1457834970486800567> ${EMOJI[choice]} **You:** ${choice}`,
          `<:tree:1457808523986731008> ${EMOJI[botChoice]} **Bot:** ${botChoice}`,
          '',
          `-# **${resultText}**`
        ].join('\n'))
        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });
      await interaction.update({ embeds: [embed], components: [] }).catch(() => {});
    });
  }
};