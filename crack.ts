import { Bot, ChatMessage, createBot } from "mineflayer";
import crypto from "crypto";
import { delay } from "q";
import { messageLoggedIn, messageRegisterFailed, messageWaitForLogin, messageWaitForRegister } from "./constants";

let exitCode = 1;

function randomString(len: number) {
	return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
};

function getChatMessageTexts(rawMessage: ChatMessage): string[] {
	const messageObjects = (rawMessage.json as any).extra as any[];
	if (!messageObjects) {
		return [];
	}
	return messageObjects.map(messageObject => messageObject.text as string);
}

type MessageQueueMap = Map<string, (message: string) => void>;

function waitForMessage(messageWaitQueue: MessageQueueMap, messageToResolve: string, messagesToReject?: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		messageWaitQueue.set(messageToResolve, (message: string) => {
			resolve(message);
		});
		if (messagesToReject) {
			for (let messageToReject of messagesToReject) {
				messageWaitQueue.set(messageToReject, (message: string) => {
					reject(message);
				});
			}
		}
	});
}

async function runOnce(targetUser: string) {
	const username = randomString(10);
	const password = randomString(8);
	const messageWaitQueue: MessageQueueMap = new Map();
	console.error(`Creating bot ${username} ${password}.`);
	const bot = createBot({
		username,
		host: 'wolfxmc.org',
		port: 25565
	});
	bot.on('message', (message) => {
		const messageLines = getChatMessageTexts(message);
		for (let line of messageLines) {
			console.error(`Message: ${line}`);
			if (line.match(/已发送到/)) {
				line = '_send_success';
			}
			if (messageWaitQueue.has(line)) {
				const fun = messageWaitQueue.get(line);
				messageWaitQueue.delete(line);
				fun(line);
			}
		}
	});
	bot.on('end', () => {
		console.error(`Bot disconnected.`);
		process.exit(exitCode);
	});
	//await waitBotLogin(bot);
	//await delay(1000);
	try {
		console.error(`Waiting for connect.`);
		await waitForMessage(messageWaitQueue, messageWaitForRegister, [messageWaitForLogin]);
		console.error(`Registering.`);
		bot.chat(`/reg ${password} ${password}`);
		await waitForMessage(messageWaitQueue, messageLoggedIn, messageRegisterFailed);
		console.error(`Paying 1000 to ${targetUser}.`);
		bot.chat(`/pay ${targetUser} 1000`);
		await waitForMessage(messageWaitQueue, '_send_success');
		console.log(`Success.`);
		exitCode = 0;
	} catch (e) {
		console.log(`Failed: ${e.toString()}`);
		exitCode = 2;
	} finally {
		bot.end();
		console.error(`Finished.`);
	}
}
runOnce(process.argv[2]);
