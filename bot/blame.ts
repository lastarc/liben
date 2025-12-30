import type { ChatInputCommandInteraction, CacheType } from "discord.js";

const ERROR_WEBHOOK = process.env.ERROR_WEBHOOK;

const onCommandFail = async (
  interaction: ChatInputCommandInteraction<CacheType>,
  error?: Error | unknown,
  logs?: string,
) => {
  if (!ERROR_WEBHOOK) return;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  const guild = interaction.guild;
  const channel = interaction.channel;
  const user = interaction.user;

  const embed = {
    title: "Command Error",
    color: 0xed4245,
    fields: [
      {
        name: "Command",
        value: `\`/${interaction.commandName}\``,
        inline: true,
      },
      {
        name: "User",
        value: `${user.tag} (${user.id})`,
        inline: true,
      },
      {
        name: "Server",
        value: guild ? `${guild.name} (${guild.id})` : "DM",
        inline: true,
      },
      {
        name: "Channel",
        value: channel ? `<#${channel.id}> (${channel.id})` : "Unknown",
        inline: true,
      },
      {
        name: "Timestamp",
        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
        inline: true,
      },
      {
        name: "Jump to Message",
        value: `[Click here](https://discord.com/channels/${guild?.id || "@me"}/${interaction.channelId}/${interaction.id})`,
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
  };

  const options: string[] = [];
  interaction.options.data.forEach((option) => {
    options.push(`${option.name}: ${option.value}`);
  });

  if (options.length > 0) {
    embed.fields.push({
      name: "Options",
      value: options.join("\n").slice(0, 1024),
      inline: false,
    });
  }

  if (errorMessage) {
    embed.fields.push({
      name: "Error Message",
      value: `\`\`\`${errorMessage.slice(0, 1000)}\`\`\``,
      inline: false,
    });
  }

  if (errorStack) {
    embed.fields.push({
      name: "Stack Trace",
      value: `\`\`\`${errorStack.slice(0, 1000)}\`\`\``,
      inline: false,
    });
  }

  if (logs) {
    embed.fields.push({
      name: "Logs",
      value: `\`\`\`${logs.slice(0, 1000)}\`\`\``,
      inline: false,
    });
  }

  try {
    await fetch(ERROR_WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [embed],
        username: "Error Reporter",
      }),
    });
  } catch (webhookError) {
    console.error("Failed to send error webhook:", webhookError);
  }
};

export { onCommandFail };
