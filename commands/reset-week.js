const { SlashCommandBuilder } = require('discord.js');
const HRController = require('../controllers/hrController');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-cycle')
        .setDescription('Reset biweekly points and start new quota period (HR only)')
        .addBooleanOption(option =>
            option.setName('confirm')
                .setDescription('Confirm the reset (REQUIRED - this cannot be undone)')
                .setRequired(false))
        .setDMPermission(false),

    async execute(interaction) {
        const confirmReset = interaction.options.getBoolean('confirm') || false;
        await HRController.resetCycle(interaction, confirmReset);
    },
};