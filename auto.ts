import { exec } from "child_process";
import { promises as fs } from "fs";
import { render } from "mustache";
import { cpus, tmpdir } from "os";
import { promisify } from "util";
import timeout from "p-timeout";
import { ProxyFetcher } from "./proxy";
import _ from "lodash";
import axios from "axios";

const execAsync = promisify(exec);

const targetUsername = process.argv[2];

let proxychainsTemplate: string;
//const processMax = cpus().length;
const processMax = 200;
const maxMs = 60000;

async function runWithProxy(proxyHost: string, proxyPort: number) {
	console.error(`${proxyHost}:${proxyPort} START`);
	try { // test it first
		await axios.get('http://mirrors.aliyun.com', {
			timeout: 5000,
			responseType: "arraybuffer",
			proxy: {
				host: proxyHost,
				port: proxyPort
			},
			validateStatus: () => true
		});
	} catch (e) {
		console.error(`${proxyHost}:${proxyPort} BAD => ${e.toString()}`);
		return false;
	}
	const proxyChainsFile = `${tmpdir()}/proxychains-${proxyHost}_${proxyPort}.conf`;
	await fs.writeFile(proxyChainsFile, render(proxychainsTemplate, { host: proxyHost, port: proxyPort }));
	try {
		console.error(`${proxyHost}:${proxyPort} CONNECT`);
		const { stdout, stderr } = await timeout(execAsync(`proxychains -f ${proxyChainsFile} node build/run.js ${targetUsername}`), maxMs);
		console.error(`${proxyHost}:${proxyPort} SUCCESS => ${stdout}`);
		return true;
	} catch (e) {
		console.error(`${proxyHost}:${proxyPort} FAIL => ${e.stdout || e.toString()}`);
		return false;
	}
}

async function mainLoop() {
	const proxyLauncher = new ProxyFetcher({
		proxySource: ["http://www.89ip.cn/tqdl.html?api=1&num=9999", "http://www.66ip.cn/mo.php?tqsl=9999"],
		useProxy: true,
		timeout: maxMs
	});
	while (true) {
		if (proxyLauncher.proxies.length < processMax) {
			console.log(`Loading Proxies.`);
			await proxyLauncher.initProxies();
		}
		await Promise.all(_.range(processMax).map(async () => {
			const { proxyIndex, proxy } = proxyLauncher.pickProxy();
			for (let i = 0; i < 3; ++i) {
				const result = await runWithProxy(proxy.host, proxy.port);
				if (!result) {
					proxyLauncher.proxies.splice(proxyIndex, 1);
					break;
				}
			}
		}));
	}
}

async function main() {
	proxychainsTemplate = await fs.readFile("./proxychains4.conf.mustache", "utf-8");
	await mainLoop();
}

main();
