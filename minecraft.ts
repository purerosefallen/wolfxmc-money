import { Bot, BotOptions, ChatMessage, createBot } from "mineflayer";
import Bunyan from "bunyan";

export type MessageQueueMap = Map<string, (message: string) => void>;

export interface MinecraftConfig {

}

function getChatMessageTexts(rawMessage: ChatMessage): string[] {
	const messageObjects = (rawMessage.json as any).extra as any[];
	if (!messageObjects) {
		return [];
	}
	return messageObjects.map(messageObject => messageObject.text as string);
}

export class Minecraft {
	options: BotOptions;
	bot: Bot;
	log: Bunyan;
	messageWaitQueue: MessageQueueMap;
	messageRejectQueue: MessageQueueMap;
	spawnCallback: () => void;
	disconnectCallback: (message: string) => void;
	died: boolean;
	resolveQueue(line: string) {
		for (let queue of [this.messageWaitQueue]) {
			if (this.messageWaitQueue.has(line)) {
				const fun = this.messageWaitQueue.get(line);
				this.messageWaitQueue.delete(line);
				fun(line);
			}
		}
	}
	constructor(options: BotOptions) {
		this.log = Bunyan.createLogger({ name: options.username });
		this.options = options;
		this.bot = createBot(options);
		this.messageWaitQueue = new Map();
		this.messageRejectQueue = new Map();
		this.bot.once("spawn", () => {
			this.log.info("connected");
			if (this.spawnCallback) {
				this.spawnCallback();
			}
		});
		this.bot.once("end", () => {
			this.log.info("disconnected");
			if (this.disconnectCallback) {
				this.disconnectCallback("disconnected");
			}
			this.died = true;
			for (let fun of this.messageRejectQueue.values()) {
				fun("disconnected");
			}
			this.messageRejectQueue.clear();
		});
		this.bot.on('message', (message) => {
			const messageLines = getChatMessageTexts(message);
			for (let line of messageLines) {
				this.log.info(`Message: ${line}`);
				if (line.match(/已发送到/)) {
					line = '_send_success';
				}
				this.resolveQueue(line);
			}
		});
		this.died = false;
	}
	waitForConnect() {
		return new Promise<void>((resolve, reject) => {
			this.spawnCallback = resolve;
			this.disconnectCallback = reject;
		});
	}
	waitForMessage(messageToResolve: string, messagesToReject?: string[]): Promise<string> {
		return new Promise((resolve, reject) => {
			this.messageWaitQueue.set(messageToResolve, (message: string) => {
				this.messageRejectQueue.delete(messageToResolve);
				for (let messageToReject of messagesToReject) {
					this.messageWaitQueue.delete(messageToReject);
				}
				resolve(message);
			});
			this.messageRejectQueue.set(messageToResolve, (message: string) => {
				reject(message);
			});
			if (messagesToReject) {
				for (let messageToReject of messagesToReject) {
					this.messageWaitQueue.set(messageToReject, (message: string) => {
						this.messageWaitQueue.delete(messageToResolve);
						this.messageRejectQueue.delete(messageToResolve);
						for (let messageToReject2 of messagesToReject) {
							this.messageWaitQueue.delete(messageToReject2);
						}
						reject(message);
					});
				}
			}
		});
	}

}
