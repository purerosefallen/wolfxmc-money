import { Bot, ChatMessage, createBot } from "mineflayer";
import crypto from "crypto";
import { delay } from "q";

const messageWaitForRegister = '请输入“/register <密码> <再输入一次以确定密码>”以注册';
const messageWaitForLogin = '请输入“/login <密码>”以登录';
const messageRegisterFailed = [
	'当前IP注册量达到上限，如果是校园网玩家请联系服主解决!',
	'此用户名还未注册过'
];
const messageLoggedIn = '已成功登录！';

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
	console.log(`Creating bot ${username} ${password}.`);
	const bot = createBot({
		username,
		host: 'wolfxmc.org',
		port: 25565
	});
	bot.on('message', (message) => {
		const messageLines = getChatMessageTexts(message);
		for (let line of messageLines) {
			console.log(`Message: ${line}`);
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
	});
	//await waitBotLogin(bot);
	//await delay(1000);
	try {
		console.log(`Waiting for connect.`);
		await waitForMessage(messageWaitQueue, messageWaitForRegister, [messageWaitForLogin]);
		console.log(`Registering.`);
		bot.chat(`/reg ${password} ${password}`);
		await waitForMessage(messageWaitQueue, messageLoggedIn, messageRegisterFailed);
		console.log(`Paying 1000 to ${targetUser}.`);
		bot.chat(`/pay ${targetUser} 1000`);
		await waitForMessage(messageWaitQueue, '_send_success');
		console.log(`Success.`);
	} catch (e) {
		console.error(`Failed: ${e.toString()}`);
	} finally {
		bot.end();
		console.log(`Finished.`);
	}
}
runOnce(process.argv[2]);
