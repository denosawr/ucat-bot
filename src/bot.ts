import {
  Client,
  Intents,
  Interaction,
  BaseCommandInteraction,
  CommandInteractionOptionResolver,
} from "discord.js";
import { Command, Event, Module } from "./interfaces";

import { loadModules } from "./modules";
import type { ModuleStore } from "./modules";

export class Bot {
  private client: Client;
  private config: any;
  private token: string;

  private modules: ModuleStore | undefined; // we load this outside the constructor

  constructor(token: string, config?: any) {
    this.config = config || {
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_PRESENCES,
      ],
    };
    this.client = new Client(this.config);
    this.token = token;
  }

  public async listen() {
    this.client.once("ready", this.onReady);

    this.modules = await loadModules();
    console.log("Loaded modules:", Array.from(this.modules.modules.keys()));

    // When called as an event, this doesn't take on the class attributes
    // We bind the value of the interactionListener's 'this' to the class
    const boundInteractionListener = this.interactionListener.bind(this);
    this.client.on("interactionCreate", boundInteractionListener);

    this.createEventHandlers();

    this.client.login(this.token);
  }

  async interactionListener(genericInteraction: Interaction) {
    // this is only ever called after the modules have been loaded
    // so this is safe to do.
    let modules = this.modules as ModuleStore;

    if (genericInteraction.isCommand()) {
      const interaction = genericInteraction as BaseCommandInteraction;
      let command =
        modules.commands.get(interaction.commandName) ||
        modules.commands.get(
          (
            interaction.options as CommandInteractionOptionResolver
          ).getSubcommand()
        );
      console.log(command);

      if (command) {
        // type cast needed because TS doesn't recognise that command must be defined
        try {
          await (command as Command).handler(this.client, interaction);
        } catch (err) {
          interaction.reply(
            `There was an issue handling this request. Error: \`\`\`${err}\`\`\``
          );
        }
        return;
      }
    }
  }

  createEventHandlers() {
    let modules = this.modules as ModuleStore;

    Array.from(modules.events).map(([name, event]) => {
      this.client.on(event.eventType, (...args) =>
        event.handler(this.client, ...args)
      );
    });
  }

  private onReady() {
    console.log("Bot started and ready!");
  }
}
