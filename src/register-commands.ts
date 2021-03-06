const { SlashCommandBuilder } = require("@discordjs/builders");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");

import { loadModules } from "./modules";

// configure environment params
require("dotenv").config();
let config = require("../config.json");
import { getServers } from "./config";

(async () => {
  const modules = await loadModules();
  console.log(modules);

  let commands = Array.from(modules.commands)
    .filter(([name, command]) => !command.prevent_automatic_registration)
    .map(([name, command]) =>
      // DOESN'T SUPPORT OPTIONS
      new SlashCommandBuilder()
        .setName(name)
        .setDescription(command.description)
    )
    .map((command) => command.toJSON());

  const rest = new REST({ version: "9" }).setToken(process.env.DISCORD_TOKEN);
  console.log("Determined the commands:", commands);

  for (let id of getServers()) {
    console.log(`Updating for server with ID ${id}`);
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, id), {
      body: commands,
    });
  }
  console.log("Successfully registered application commands.");
})();
