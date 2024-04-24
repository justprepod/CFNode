import {Web3}  from "web3";
import {Connector} from "./Connector";
import {AppConfig, LockData, LockInfo, Coalition, SigPartI, SigPartII, Transaction, Hash, Signature, calculate_object_hash, AckData} from "./Utils";
import sqlite3 from 'sqlite3';
import {Logger, create_logger } from './Logger';

let log : any = create_logger('silly');

export class StubConnector implements Connector {
    //config : StubConfig;
    db : any;

    db_run(method : string, request : string){
        let db = this.db;
        return new Promise(function(resolve, reject){
            try {
                db[method](request, (err, rows) => {
                    if (err){
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            } catch(e){
                reject(e);
            }
        });
    }

    constructor (filename : string){
        log.debug(`StubConnector::constructor(${filename})`);
        //this.config = config;
        this.db = new sqlite3.Database(filename);
    }

    async send_tx(tx : Transaction) : Promise<Hash>{
        log.debug(`StubConnector::send_tx(${JSON.stringify(tx)})`);
        let hash = tx.hash();
        await this.db_run('run', 'BEGIN TRANSACTION');
        let sql = this.db.prepare(`INSERT OR IGNORE INTO txs (hash, data) VALUES(?, ?)`);
        await sql.run([hash.hex, JSON.stringify(tx.json(), null, 2)]);
        await this.db_run('run', 'COMMIT TRANSACTION');
        return hash;
    }

    async read_lock(lock_info : LockInfo) : Promise<LockData> {
        log.debug(`StubConnector::read_lock(${JSON.stringify(lock_info)})`);
        let sql = `SELECT * FROM txs WHERE hash = '${lock_info.tx_hash.hex}'`;
        log.verbose(`sql = ${sql}`);
        let row : any = await this.db_run('get', sql);

        let lock_data : LockData;

        if (row) {
            let data : any = JSON.parse(row.data);
            data.src_network_id = 0;
            data.dst_network_id = 1;
            lock_data = new LockData(data);
            return lock_data;
        } else {
            log.error(`StubConnector: failed to read lock_data for ${JSON.stringify(lock_info)}`);
            return undefined;
        }
    }

    async send_acknowledgment(lock_info : LockInfo, ack_data : AckData){
        log.debug(`CFConnectorStub::send_acknowledgment(${JSON.stringify(lock_info)})`);
        log.assert(lock_info.network_id == 0, "this version allows only from 0 to 1 direction");

        let lock_hash = calculate_object_hash(lock_info);
        let sql : string = `INSERT OR IGNORE INTO storage (key, value) VALUES('${lock_hash.hex}', '${ack_data.id}')`;
        this.db_run('run', sql);
    }

    /**
     * Reads acknowledments to participate in coalition for certain lock transaction
     * @param lock_info
     * @returns 
     */
    async read_acknowledments(lock_info : LockInfo) : Promise<Coalition>{
        log.debug(`CFConnectorStub::read_acknowledments(${JSON.stringify(lock_info)})`);
        throw "not implemented";

    }

    async send_sig_part_i(lock_info : LockInfo, sig_part_i : SigPartI){
        log.debug(`CFConnectorStub::send_sig_part_i(${JSON.stringify(lock_info)}, ${JSON.stringify(sig_part_i)})`);
        return false;
    }

    async read_sigs_i(lock_info : LockInfo) : Promise<Array<SigPartI>>{
        let sigs_i : Array<SigPartI>;

        return sigs_i;
    }

    async send_sig_part_ii(lock_info : LockInfo, sig_part_i : SigPartII){
        return false;
    }    

    async read_sigs_ii(lock_info : LockInfo) : Promise<Array<SigPartII>>{
        let sigs_ii : Array<SigPartII>;

        return sigs_ii;
    }
    
}