const { PermissionFlagsBits } = require('discord.js');

async function handleRoleCommand(message, args) {
    // Check if the user executing the command has permission to manage roles
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return message.reply({ 
            content: "❌ You don't have the **Manage Roles** permission to use this command.", 
            allowedMentions: { repliedUser: false } 
        });
    }

    // Check if the bot itself has permission to manage roles
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return message.reply({ 
            content: "❌ I don't have the **Manage Roles** permission. Please check my role permissions in server settings.", 
            allowedMentions: { repliedUser: false } 
        });
    }

    // Get the mentioned member
    const targetMember = message.mentions.members.first();

    // Get the role: Check if a role was pinged first, otherwise search by name using the text arguments
    let roleToToggle = message.mentions.roles.first();
    
    if (!roleToToggle && targetMember && args.length > 1) {
        // Join all arguments after the user mention and strip out the user ping string to get the raw role name
        const roleQuery = args.slice(1).join(" ").replace(/<@!?\d+>/g, "").trim().toLowerCase();
        
        // Search the guild roles by name (case-insensitive) or exact ID match
        roleToToggle = message.guild.roles.cache.find(role => 
            role.name.toLowerCase() === roleQuery || role.id === roleQuery
        );
    }

    if (!targetMember || !roleToToggle) {
        return message.reply({ 
            content: "⚠️ Please mention a user and provide a valid role name or ping.\nUsage: `?role @user Role Name` or `?role @user @role`", 
            allowedMentions: { repliedUser: false } 
        });
    }

    // Prevent modifying roles higher than or equal to the bot's highest role
    if (roleToToggle.position >= message.guild.members.me.roles.highest.position) {
        return message.reply({ 
            content: "❌ I cannot manage this role because it is higher than or equal to my highest role in the role list.", 
            allowedMentions: { repliedUser: false } 
        });
    }

    // Prevent modifying roles higher than or equal to the command executor's role (optional safety check)
    if (message.member.id !== message.guild.ownerId && roleToToggle.position >= message.member.roles.highest.position) {
        return message.reply({ 
            content: "❌ You cannot assign or remove a role that is higher than or equal to your highest role.", 
            allowedMentions: { repliedUser: false } 
        });
    }

    try {
        // Toggle the role: Remove if they have it, Add if they don't
        if (targetMember.roles.cache.has(roleToToggle.id)) {
            await targetMember.roles.remove(roleToToggle);
            return message.reply({ 
                content: `✅ Successfully removed the **${roleToToggle.name}** role from ${targetMember}.`, 
                allowedMentions: { repliedUser: false } 
            });
        } else {
            await targetMember.roles.add(roleToToggle);
            return message.reply({ 
                content: `✅ Successfully added the **${roleToToggle.name}** role to ${targetMember}.`, 
                allowedMentions: { repliedUser: false } 
            });
        }
    } catch (error) {
        console.error("Error executing role command:", error);
        return message.reply({ 
            content: "❌ There was an error trying to modify this role. Please check my permissions.", 
            allowedMentions: { repliedUser: false } 
        });
    }
}

module.exports = { handleRoleCommand };
