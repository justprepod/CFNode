import * as fs from 'fs';
import yargs from "yargs"
import { describe, it, before } from 'mocha';
import { strict as assert } from 'assert';

import {AppConfig, LockInfo, Hash, Transaction, StubConfig} from "../src/Utils";
import { CFNode } from "../src/CFNode";
import { StubConnector } from '../src/StubConnector';
import {Logger, create_logger } from '../src/Logger';

let log : any = create_logger('info');

const CONFIG_FILENAME = 'src/config.json';
let argv = yargs.argv;
let config_filename = argv.config || CONFIG_FILENAME;

console.info('Loading config from', config_filename, '...');

let config : AppConfig;
let cfg : AppConfig;
try {
    let content = fs.readFileSync(config_filename, 'utf8');
    cfg = JSON.parse(content);
//    if (config){
//        config = Object.assign(config, cfg);
    config = cfg;
    console.info(`config = ${JSON.stringify(config)}`);
} catch (e) {
    console.info(`Failed to read config from file - ${JSON.stringify(e)}`);
}

let sender_filename : string = 'ether.db';

describe('happy_case', function () {
    this.timeout(0);
    this.slow(60*60*1000);

    let node : CFNode;
    let c : StubConnector;
  
    before(async function(){
        c = new StubConnector(sender_filename);

        node = new CFNode(config);
        await node.init();
    });

    it('simple bridge', async function () {
        let lock_tx : Transaction = new Transaction({from : "alice", to : "vault0", amount : "100", asset: "USDT"});        
        let lock_tx_hash : Hash = await c.send_tx(lock_tx);        
        assert(lock_tx_hash);
        log.info(`successfully sent transaction ${lock_tx_hash.hex}`);

        let lock_info : LockInfo = {network_id: 0, tx_hash: lock_tx_hash};

        let notify_result : boolean = await node.on_notify(lock_info);
        assert(notify_result);

        let sig_part_i_result : boolean = await node.init_sig_part_i(lock_info);

        assert(sig_part_i_result);
    })
})

describe('algorith failures', function(){
    this.timeout(0);
    this.slow(60*60*1000);

    let node : CFNode;
    let c : StubConnector;
  
    before(async function(){
        c = new StubConnector(sender_filename);

        node = new CFNode(config);
        await node.init();
    });

    it('bad notify hash', async function(){        
        let lock_tx : Transaction = new Transaction({from : "zzzzz", to : "vault0", amount : "100", asset: "USDT"});        
        
        let notify_result : boolean = await node.on_notify({network_id: 0, tx_hash: lock_tx.hash()});
        assert(notify_result == false);
    })

    it('bad destination address', async function(){        
        let lock_tx : Transaction = new Transaction({from : "alice", to : "zzzzzzz", amount : "100", asset: "USDT"});        
        let lock_tx_hash : Hash = await c.send_tx(lock_tx);        
        assert(lock_tx_hash);
        log.info(`successfully sent transaction ${lock_tx_hash.hex}`);

        let lock_info : LockInfo = {network_id: 0, tx_hash: lock_tx_hash};

        let notify_result : boolean = await node.on_notify(lock_info);
        assert(notify_result == false);
    })

    it('bad token', async function(){        
        let lock_tx : Transaction = new Transaction({from : "alice", to : "vault0", amount : "100", asset: "USDTa"});        
        let lock_tx_hash : Hash = await c.send_tx(lock_tx);        
        assert(lock_tx_hash);
        log.info(`successfully sent transaction ${lock_tx_hash.hex}`);

        let lock_info : LockInfo = {network_id: 0, tx_hash: lock_tx_hash};

        let notify_result : boolean = await node.on_notify(lock_info);
        assert(notify_result == false);

    })

})
