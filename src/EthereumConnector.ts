import {Web3}  from "web3";
import {Connector} from "./Connector";
import {AppConfig, LockData, LockInfo, Coalition, SigPartI, SigPartII, Transaction, Hash, Signature, calculate_object_hash, AckData} from "./Utils";

export class EthereumConnector implements Connector {
    web3 : Web3;

    constructor (rpc : string){        
        console.info(`EthereumConnector::constructor(${rpc})`);
        this.web3 = new Web3(rpc);
    }

    async send_tx(tx : Transaction){
        throw "Not implemented";
    }

    async read_lock(lock_info : LockInfo) : Promise<LockData> {
        throw "Not implemented";
    }

    async send_acknowledgment(lock_info : LockInfo, ack_data : AckData){
        throw "Not implemented";
    }

    async read_acknowledments(lock_info : LockInfo) : Promise<Coalition>{
        throw "Not implemented";
    }

    async send_sig_part_i(lock_info : LockInfo, sig_part_i : SigPartI){
        throw "Not implemented";
    }

    async read_sigs_i(lock_info : LockInfo) : Promise<Array<SigPartI>>{
        throw "Not implemented";
    }

    async send_sig_part_ii(lock_info : LockInfo, sig_part_i : SigPartII){
        throw "Not implemented";
    }    

    async read_sigs_ii(lock_info : LockInfo) : Promise<Array<SigPartII>>{
        throw "Not implemented";
    }
}