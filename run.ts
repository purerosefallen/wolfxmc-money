import { Bot, ChatMessage, createBot } from "mineflayer";
import crypto from "crypto";
import { delay } from "q";
import { messageLoggedIn, messageRegisterFailed, messageWaitForLogin, messageWaitForRegister } from "./constants";
import { Minecraft } from "./minecraft";

let exitCode = 1;

function randomString(len: number) {
	return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
};

async function runOnce(targetUser: string) {
	const username = randomString(10);
	const password = randomString(8);
	console.error(`Creating bot ${username} ${password}.`);
	const mc = new Minecraft({
		username,
		host: 'wolfxmc.org',
		port: 25565
	});
	//await waitBotLogin(bot);
	//await delay(1000);
	try {
		console.error(`Waiting for connect.`);
		await mc.waitForMessage(messageWaitForRegister, [messageWaitForLogin]);
		console.error(`Registering.`);
		mc.bot.chat(`/reg ${password} ${password}`);
		await mc.waitForMessage(messageLoggedIn, messageRegisterFailed);
		console.error(`Paying 1000 to ${targetUser}.`);
		mc.bot.chat(`/pay ${targetUser} 1000`);
		await mc.waitForMessage('_send_success', ["玩家未在线（或不存在）"]);
		console.log(`Success.`);
		exitCode = 0;
	} catch (e) {
		console.log(`Failed: ${e.toString()}`);
		exitCode = 2;
	} finally {
		mc.bot.end();
		console.error(`Finished.`);
	}
}
runOnce(process.argv[2]);
