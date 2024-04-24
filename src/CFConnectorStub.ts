import {AppConfig, LockData, LockInfo, Coalition, SigPartI, SigPartII, Transaction, Hash, Signature, calculate_object_hash, AckData} from "./Utils";
import sqlite3 from 'sqlite3';
import {Logger, create_logger } from './Logger';

let log : any = create_logger('silly');

export class CFConnectorStub{
    //config : AppConfig;
    db : any;

    sql(method : string, request : string){
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

    constructor (rpc : string){
        log.debug(`CFConnectorStub::constructor(${rpc})`);
        //this.config = config;
        this.db = new sqlite3.Database(rpc);
        log = create_logger('silly');
    }

    async send_acknowledgment(lock_info : LockInfo, ack_data : AckData){
        log.debug(`CFConnectorStub::send_acknowledgment(${JSON.stringify(lock_info)})`);
        log.assert(lock_info.network_id == 0, "this version allows only from 0 to 1 direction");

        let lock_hash = calculate_object_hash(lock_info);
        let sql : string = `INSERT OR IGNORE INTO storage (key, value) VALUES('${lock_hash}', '${ack_data.id}')`;
        this.sql('run', sql);
    }

    /**
     * Reads acknowledments to participate in coalition for certain lock transaction
     * @param lock_info
     * @returns 
     */
    async read_acknowledments(lock_info : LockInfo) : Promise<Coalition>{
        log.debug(`CFConnectorStub::read_acknowledments(${JSON.stringify(lock_info)})`);

        //read for all agreemens on specified info
        let coalition : Coalition = {members:["1", "2"]};

        return coalition;
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