import * as fs from 'fs';
import yargs from "yargs"
import { describe, it, before } from 'mocha';
import { strict as assert } from 'assert';

import {AppConfig, LockInfo, Hash, Transaction, StubConfig} from "../src/Utils";
import { CFNode } from "../src/CFNode";
import { StubConnector } from '../src/StubConnector';
import {Logger, create_logger } from '../src/Logger';
import { EthereumConnector } from '../src/EthereumConnector';

let log : any = create_logger('info');

/*
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
*/

let config1 : AppConfig;
let config2 : AppConfig;

try {
    config1 = JSON.parse(fs.readFileSync("src/config.json", 'utf8'));
    config2 = JSON.parse(fs.readFileSync("src/config2.json", 'utf8'));
} catch(e){
    console.info(`Failed to read config - ${JSON.stringify(e)}`);
}

let sender_rpc : string = 'https://bsc-testnet.blastapi.io/12502a75-92f1-4eca-8d9c-058534c9d931';
let sender_address = '0xdD4d29cA72C6ACE6D4226309574e3cf387b88FD1';
let sender_sk = "58ee1c2fb9e9d47215735e4480f25758494ff96e8bda9bf3a3c698ba4b5091ce";

let vault_address = '0x7Eb8E4467cd62e1D8D888C253929eCaDB2AcD42d';
let src_token_hash = '0x7E25310573883d838E751831D994548f251c46b4';
let dst_token_hash = '0x911F5FF28Efc0599eF75E7F16b67DF136ec6b5B1';


let default_tx : Transaction = new Transaction({from : sender_address, to : vault_address, amount : "100", asset: src_token_hash});

describe('happy_case', function () {
    this.timeout(0);
    this.slow(60*60*1000);

    let node1 : CFNode;
    let node2 : CFNode;
    let c : EthereumConnector;
  
    before(async function(){
        c = new EthereumConnector(sender_rpc);

        node1 = new CFNode(config1);
        await node1.init();

        node2 = new CFNode(config2);
        await node2.init();
    });

    it('simple bridge', async function () {
        /*
        let lock_tx = default_tx;
        let lock_tx_hash : Hash = await c.send_lock(lock_tx, sender_sk);        
        assert(lock_tx_hash);
        log.info(`successfully sent transaction ${lock_tx_hash.hex}`);

        let lock_info : LockInfo = {network_id: 0, tx_hash: lock_tx_hash};
        */

        let lock_info : LockInfo = {network_id: 0, tx_hash: new Hash(`0x0c18cd4400520e7f5016a30af097c21c10021f38f3160f12a3450fd46c0be319`)};

        let notify_result1 : boolean = await node1.on_notify(lock_info);
        assert(notify_result1);

        let notify_result2 : boolean = await node2.on_notify(lock_info);
        assert(notify_result2);

        let sig_part_i_result1 : boolean = await node1.init_sig_part_i(lock_info);
        assert(sig_part_i_result1);

        let sig_part_i_result2 : boolean = await node2.init_sig_part_i(lock_info);
        assert(sig_part_i_result2);
        
        let sig_part_ii_result1 : boolean = await node1.init_sig_part_ii(lock_info);
        assert(sig_part_ii_result1);
    })
})

describe('algorithm failures', function(){
    this.timeout(0);
    this.slow(60*60*1000);

    let node1 : CFNode;
    let node2 : CFNode;
    let c : EthereumConnector;
  
    before(async function(){
        c = new EthereumConnector(sender_rpc);

        node1 = new CFNode(config1);
        await node1.init();

        node2 = new CFNode(config2);
        await node2.init();
    });

    it('bad notify hash', async function(){        
        let lock_tx = default_tx;
        
        let notify_result : boolean = await node1.on_notify({network_id: 0, tx_hash: lock_tx.hash()});
        assert(notify_result == false);
    })

    it('bad destination address', async function(){        
        let lock_tx = default_tx;

        let lock_tx_hash : Hash = await c.send_lock(lock_tx, sender_sk);        
        assert(lock_tx_hash);
        log.info(`successfully sent transaction ${lock_tx_hash.hex}`);

        let lock_info : LockInfo = {network_id: 0, tx_hash: lock_tx_hash};

        let notify_result : boolean = await node1.on_notify(lock_info);
        assert(notify_result == false);
    })

    it('bad token', async function(){        
        let lock_tx = default_tx;

        let lock_tx_hash : Hash = await c.send_lock(lock_tx, sender_sk);        
        assert(lock_tx_hash);
        log.info(`successfully sent transaction ${lock_tx_hash.hex}`);

        let lock_info : LockInfo = {network_id: 0, tx_hash: lock_tx_hash};

        let notify_result : boolean = await node1.on_notify(lock_info);
        assert(notify_result == false);

    })

    it('not enough acks', async function () {
        let lock_tx = default_tx;

        let lock_tx_hash : Hash = await c.send_lock(lock_tx, sender_sk);        
        assert(lock_tx_hash);
        log.info(`successfully sent transaction ${lock_tx_hash.hex}`);

        let lock_info : LockInfo = {network_id: 0, tx_hash: lock_tx_hash};

        let notify_result : boolean = await node1.on_notify(lock_info);
        assert(notify_result);

        let sig_part_i_result : boolean = await node1.init_sig_part_i(lock_info);

        assert(sig_part_i_result == false);
    })

    it('not enoughs sigs_i', async function () {
        let lock_tx = default_tx;

        let lock_tx_hash : Hash = await c.send_lock(lock_tx, sender_sk);        
        assert(lock_tx_hash);
        log.info(`successfully sent transaction ${lock_tx_hash.hex}`);

        let lock_info : LockInfo = {network_id: 0, tx_hash: lock_tx_hash};

        let notify_result1 : boolean = await node1.on_notify(lock_info);
        assert(notify_result1);

        let notify_result2 : boolean = await node2.on_notify(lock_info);
        assert(notify_result2);

        let sig_part_i_result1 : boolean = await node1.init_sig_part_i(lock_info);
        assert(sig_part_i_result1);

        let sig_part_ii_result1 : boolean = await node1.init_sig_part_ii(lock_info);
        assert(sig_part_ii_result1 == false);
    })
})
