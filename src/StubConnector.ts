import {Web3}  from "web3";
import {Connector} from "./Connector";
import {AppConfig, LockData, LockInfo, Coalition, SigPartI, SigPartII, Transaction, Hash, Signature, AckData, SigShare, calculate_object_hash} from "./Utils";
import sqlite3 from 'sqlite3';
import {Logger, create_logger } from './Logger';

let log : any = create_logger('silly');

export class StubConnector implements Connector {
    db : any;

    db_run(method : string, request : string) : Promise<Array<any>>{
        let db = this.db;
        log.silly(`SQLITE: ${request}`);
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
        log.verbose(`StubConnector::constructor(${filename})`);
        this.db = new sqlite3.Database(filename);
    }

    async send_lock(tx : Transaction) : Promise<Hash>{
        log.verbose(`StubConnector::send_tx(${JSON.stringify(tx)})`);
        let hash = tx.hash();
        await this.db_run('run', 'BEGIN TRANSACTION');
        let sql = this.db.prepare(`INSERT OR IGNORE INTO txs (hash, data) VALUES(?, ?)`);
        await sql.run([hash.hex, JSON.stringify(tx.json(), null, 2)]);
        await this.db_run('run', 'COMMIT TRANSACTION');
        return hash;
    }

    async read_lock(lock_info : LockInfo) : Promise<LockData> {
        log.verbose(`StubConnector::read_lock(${JSON.stringify(lock_info)})`);
        let sql = `SELECT * FROM txs WHERE hash = '${lock_info.tx_hash.hex}'`;
        log.silly(`sql = ${sql}`);
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

    async send_acknowledgment(ack_data : AckData) : Promise<boolean>{
        log.verbose(`StubConnector::send_acknowledgment(${JSON.stringify(ack_data)})`);

        await this.db_run('run', 'BEGIN TRANSACTION');
        let sql : string = `INSERT OR REPLACE INTO storage (type, key, value) VALUES('acknowledgment', '${ack_data.hash}', '${ack_data.id}')`;
        await this.db_run('run', sql);
        await this.db_run('run', 'COMMIT TRANSACTION');

        return true;
    }

    /**
     * Reads acknowledments to participate in coalition for certain lock transaction
     * @param hash
     * @returns 
     */
    async read_acknowledments(hash : Hash) : Promise<Coalition>{
        log.verbose(`StubConnector::read_acknowledments(${hash.hex})`);

        let coalition : Coalition = {members:[]};

        let sql : string = `SELECT * FROM storage WHERE type='acknowledgment' AND key='${hash.hex}'`;
        let rows : Array<any> = await this.db_run('all', sql);
        rows.forEach(r => coalition.members.push(r.value));

        return coalition;
    }

    /**
     * Sends array of SigPartI to storage.
     * @param sig_part_i 
     * @returns 
     */
    async send_sig_part_i(lock_info : LockInfo, sig_part_i : SigPartI){
        log.verbose(`StubConnector::send_sig_part_i(${JSON.stringify(lock_info)}, ${JSON.stringify(sig_part_i)})`);

        let lock_hash : Hash = calculate_object_hash(lock_info);

        await this.db_run('run', 'BEGIN TRANSACTION');
        sig_part_i.shares.forEach(async share => {
            let sql : string = `INSERT OR REPLACE INTO storage (type, key, value) VALUES('sig_i', '${lock_hash.hex}', '${JSON.stringify(share)}')`;
            await this.db_run('run', sql);
        });
        await this.db_run('run', 'COMMIT TRANSACTION');

        return true;
    }

    /**
     * Reads designated to certain node array of SigPartI associated with lock information
     * @param hash 
     * @returns 
     */
    async read_sigs_i(hash : Hash, node_id : string) : Promise<Array<SigShare>>{
        log.verbose(`StubConnector::read_sigs_i(${hash.hex}, ${node_id})`);

        let sql : string = `SELECT * FROM storage WHERE type='sig_i' AND key='${hash.hex}'`;
        let rows : Array<any> = await this.db_run('all', sql);

        log.silly(`StubConnector::read_sigs_i - rows = ${JSON.stringify(rows)}`);

        let rows_parsed = rows.map(r => (JSON.parse(r.value)));

        log.silly(`StubConnector::read_sigs_i - rows_parsed = ${JSON.stringify(rows_parsed)}`);

        let sigs_i : Array<SigShare> = rows_parsed.filter(r => r.to === node_id);

        return sigs_i;
    }

    async send_sig_part_ii(lock_info : LockInfo, sig_part_ii : SigPartII){
        log.verbose(`StubConnector::send_sig_part_ii(${JSON.stringify(lock_info)}, ${JSON.stringify(sig_part_ii)})`);
        let lock_hash : Hash = calculate_object_hash(lock_info);

        await this.db_run('run', 'BEGIN TRANSACTION');
        let sql : string = `INSERT OR REPLACE INTO storage (type, key, value) VALUES('sig_ii', '${lock_hash.hex}', '${JSON.stringify(sig_part_ii)}')`;
        await this.db_run('run', sql);
        await this.db_run('run', 'COMMIT TRANSACTION');

        return true;
    }

    async read_sigs_ii(hash : Hash) : Promise<Array<SigPartII>>{
        log.verbose(`StubConnector::read_sigs_ii(${hash.hex})`);

        let sql : string = `SELECT * FROM storage WHERE type='sig_ii' AND key='${hash.hex}'`;
        let rows : Array<any> = await this.db_run('all', sql);

        log.silly(`StubConnector::read_sigs_ii - rows = ${JSON.stringify(rows)}`);

        let sigs_ii : Array<SigPartII> = rows.map(r => (JSON.parse(r.value)));

        log.silly(`StubConnector::read_sigs_ii - rows_parsed = ${JSON.stringify(sigs_ii)}`);

        return sigs_ii;
    }
}