// commands/submit-event.js - MRB event submission with 9 event types
const { SlashCommandBuilder } = require('discord.js');
const EventController = require('../controllers/eventController');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('submit-event')
        .setDescription('Submit an MRB event for points')
        .addStringOption(option =>
            option.setName('event-type')
                .setDescription('Type of event completed')
                .setRequired(true)
                .addChoices(
                    { name: 'MRB Mass Patrol (4pts)', value: 'mrb_mass_patrol' },
                    { name: 'Solo Patrol (1pt per 30min)', value: 'solo_patrol' },
                    { name: 'Combat Training (2pts)', value: 'combat_training' },
                    { name: 'Gang Deployment (4pts)', value: 'gang_deployment' },
                    { name: 'VIP Protection (4pts)', value: 'vip_protection' },
                    { name: 'Warrant Execution (10pts)', value: 'warrant_execution' },
                    { name: 'MRB Inspection (3pts)', value: 'mrb_inspection' },
                    { name: 'MRB Tryout - Public (4pts)', value: 'mrb_tryout_public' },
                    { name: 'MRB Tryout - Private (3pts)', value: 'mrb_tryout_private' }
                ))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Brief description of the event')
                .setRequired(true)
                .setMaxLength(500))
        .addAttachmentOption(option =>
            option.setName('screenshot1')
                .setDescription('Primary screenshot proof (REQUIRED)')
                .setRequired(true))
        .addAttachmentOption(option =>
            option.setName('screenshot2')
                .setDescription('Additional screenshot proof (optional)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('screenshot3')
                .setDescription('Additional screenshot proof (optional)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('How many times did you do this event? (Default: 1)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(20))
        .setDMPermission(false),

    async execute(interaction) {
        const eventType = interaction.options.getString('event-type');
        const description = interaction.options.getString('description');
        const screenshot1 = interaction.options.getAttachment('screenshot1');
        const screenshot2 = interaction.options.getAttachment('screenshot2');
        const screenshot3 = interaction.options.getAttachment('screenshot3');
        const quantity = interaction.options.getInteger('quantity') || 1;

        // Collect only non-null screenshots
        const screenshots = [screenshot1];
        if (screenshot2) screenshots.push(screenshot2);
        if (screenshot3) screenshots.push(screenshot3);

        console.log(`📸 Screenshots collected: ${screenshots.length}`);

        // Call the event controller
        await EventController.submitEvent(interaction, eventType, description, screenshots, quantity);
    },
};