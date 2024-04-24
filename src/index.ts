import {AppConfig, LockInfo, Hash, Transaction} from "./Utils";
import { CFNode } from "./CFNode";
import yargs from "yargs"
import * as fs from 'fs';

const CONFIG_FILENAME = '../config.json';

let config : AppConfig;

let main = async function () {
    let argv = yargs.argv;
    let config_filename = argv.config || CONFIG_FILENAME;

    console.info('Loading config from', config_filename, '...');

    let cfg : AppConfig;
    try {
        let content = fs.readFileSync(config_filename, 'utf8');
        cfg = JSON.parse(content);
        if (config){
            config = Object.assign(config, cfg);
        } else {
            config = cfg;
        }
    } catch (e) {
        console.info(`Failed to read config from file - ${JSON.stringify(e)}`);
    }
    
    console.info(`config = ${JSON.stringify(config)}`);
        
    let node = new CFNode(config);
    await node.init();
}

main();

