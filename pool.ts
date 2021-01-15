import Logger from "bunyan";
import _ from "lodash";
import { Bot, BotOptions } from "mineflayer";
import pTimeout from "p-timeout";
import pAny from "p-any";
import pQueue from "p-queue";
import { messageWaitForLogin, messageWaitForRegister } from "./constants";
import { Minecraft } from "./minecraft";
export class MinecraftPool {
	size: number;
	options: BotOptions;
	connections: Minecraft[];
	refillQueue: pQueue;
	constructor(size: number, options: BotOptions) {
		this.size = size;
		this.options = options;
		this.connections = [];
		this.refillQueue = new pQueue({ concurrency: 1 });
		this.refill();
	}
	private async addOne() {
		const mc = new Minecraft(this.options, Logger.WARN);
		try {
			await pTimeout(mc.waitForMessage(messageWaitForLogin, [messageWaitForRegister]), 10000);
		} catch (e) {
			//console.error("CONNECTION ERROR", e.toString());
			throw e;
		}
		this.connections.push(mc);
	}
	private async refillProcess() {
		const fillNeededCount = this.size - this.connections.length;
		if (fillNeededCount <= 0) {
			return;
		}
		while (true) {
			try {
				await pAny(_.range(fillNeededCount).map(() => this.addOne()));
				return;
			} catch (e) {
				//console.log("All connections failed. Retrying.");
			}
		}
	}
	private async refill() {
		await this.refillQueue.onEmpty();
		await this.refillQueue.add(async () => {
			await this.refillProcess();
		})
	}
	async pickOne() {
		this.connections = this.connections.filter(mc => !mc.died);
		if (!this.connections.length) {
			await this.refill();
		} else if (this.connections.length < this.size) {
			this.refill();
		}
		return this.connections[Math.floor(Math.random() * this.connections.length)];
	}
}
