import {StubConnector} from './StubConnector';
import { EthereumConnector } from './EthereumConnector';
import {AppConfig, LockData, LockInfo, Coalition, SigPartI, SigPartII, Transaction, Hash, Signature, TokenMatchInfo, AckData, ZanoConfig, EtherConfig, StubConfig, calculate_object_hash, SigShare} from "./Utils";
import {ShamirMath} from './ShamirMath';
import {Logger, create_logger } from './Logger';
import { Connector } from './Connector';

let log : any = create_logger('silly');

export class CFNode {
    config : AppConfig;
    cf_connector : Connector;
    token_match_table : Array<TokenMatchInfo>;
    log : any;
    networks : Array<{network_id:number, iface:Connector}>;

    constructor (config : AppConfig){
        log.info(`CFNode::constructor(${JSON.stringify(config)})`);
        this.config = config;
    }

    /**
     * Loads information on how tokens in different networks match each other
     */
    async load_token_match_info(){
        this.token_match_table = [
            //{src_network : 0, dst_network : 1, src_decimals : 6, dst_decimals : 6, src_hash: "USDT", dst_hash: "USDT"}
            {src_network : 0, dst_network : 1, src_decimals : 6, dst_decimals : 6, src_hash: "0x7e25310573883d838e751831d994548f251c46b4", dst_hash: "0x911F5FF28Efc0599eF75E7F16b67DF136ec6b5B1"}
        ];
    }

    /**
     * Takes LockData and generates unlock transaction for destination network - destination address, asset and amount - according to token_match_table
     * 
     * @param lock_data 
     * @returns Transaction object to be sent in destination network
     */

    create_unlock_tx(lock_data : LockData) : Transaction {
        log.verbose(`CFNode::create_unlock_tx(${JSON.stringify(lock_data)})`);
        let tx : Transaction;

        log.assert(lock_data.src_network_id == 0 && lock_data.dst_network_id == 1, "this version allows only from 0 to 1 direction");

        let src_network = this.config.networks.find(n => n.network_id === lock_data.src_network_id);
        if (!src_network){
            log.error(`CFNode::create_unlock_tx - dst_network_id not found ${lock_data.src_network_id}`);
            return undefined;
        }

        let dst_network = this.config.networks.find(n => n.network_id === lock_data.dst_network_id);
        if (!dst_network){
            log.error(`CFNode::create_unlock_tx - dst_network_id not found ${lock_data.dst_network_id}`);
            return undefined;
        }

        if (lock_data.to != src_network.vault_address){
            log.warn(`Bad destination in lock transaction ${lock_data.to}`);
        } else {
            let token_match_info : TokenMatchInfo = this.token_match_table.find(m => m.src_network === lock_data.src_network_id && m.src_hash === lock_data.asset && m.dst_network === lock_data.dst_network_id);
            if (!token_match_info){
                log.error(`Failed to retrieve token match information for ${JSON.stringify(lock_data)}`);
            } else {
                let from = dst_network.vault_address;
                let to = lock_data.from;
                let asset = lock_data.asset;
                let amount = lock_data.amount;
            
                tx = new Transaction({from, to, asset, amount});
            }
        }

        return tx;
    }

    /**
     * 
     * @param lock_info : LockInfo - lock transaction info
     * @returns LockData - information on lock or undefined
     */
    async read_lock_data(lock_info : LockInfo) : Promise<LockData>{
        log.verbose(`CFNode::read_lock_data(${JSON.stringify(lock_info)})`);
        log.assert(lock_info.network_id == 0, "this version allows only from 0 to 1 direction");

        let lock_data : LockData = await this.networks.find(n => n.network_id === lock_info.network_id).iface.read_lock(lock_info);
        return lock_data;
    }

    /**
     * Handles notification for lock transaction in source chain
     * 
     * @param {LockInfo} lock_info - lock transaction
     */
    async on_notify(lock_info : LockInfo) : Promise<boolean>{
        log.verbose(`CFNode::on_notify(${JSON.stringify(lock_info)})`);
        let lock_data : LockData = await this.read_lock_data(lock_info);

        if (!lock_data){
            log.debug(`CFNode::on_notify - Failed to retrieve lock data for ${JSON.stringify(lock_info)}`);
            return false;
        } else {
            log.silly(`CFNode::on_notify - lock_data = ${JSON.stringify(lock_data)}`);
            let tx : Transaction = this.create_unlock_tx(lock_data);

            log.silly(`CFNode::on_notify - tx = ${JSON.stringify(tx)}`);

            if (tx) {
                let lock_hash = calculate_object_hash(lock_info);

                let ack_data : AckData = {hash : lock_hash.hex, id : this.config.cf_network.node_id};
        
                if (await this.cf_connector.send_acknowledgment(ack_data)){
                    log.info(`CFNode::on_notify - Successfully sent ${JSON.stringify(lock_data)}`);
                    return true;
                } else {
                    log.error(`CFNode::on_notify - Failed to send ${JSON.stringify(lock_data)}`);
                    return false;
                }
            } else {
                log.error(`CFNode::on_notify - Failed to generate transaction for ${JSON.stringify(lock_data)}`);
                return false;
            }
        }
    }

    async start_sig_part_i(lock_info : LockInfo, coalition : Coalition) : Promise<boolean>{
        log.verbose(`CFNode::start_sig_part_i(${JSON.stringify(lock_info)}, ${JSON.stringify(coalition)})`);
        let lock_data : LockData = await this.read_lock_data(lock_info);
        let tx : Transaction = this.create_unlock_tx(lock_data);
        if (!tx){
            log.error(`CFNode::start_sig_part_i - Cannot generate transaction for ${lock_data}`);
            return false;
        }

        let node_id = this.config.cf_network.node_id;

        let hash : Hash = tx.hash();
        let sig_part_i : SigPartI = await ShamirMath.create_sig_part_i(hash, node_id, coalition);

        if (sig_part_i) {
            if (await this.cf_connector.send_sig_part_i(lock_info, sig_part_i)){
                log.info(`CFNode::start_sig_part_i - Succesfully sent ${JSON.stringify(sig_part_i)}`);
                return true;
            } else {
                log.error(`CFNode::start_sig_part_i - Failed to send ${JSON.stringify(sig_part_i)}`);
                return false;
            }
        } else {
            log.error(`CFNode::start_sig_part_i - Creating sig_part_i failed`);
            return false;
        }
    }

    async init_sig_part_i(lock_info : LockInfo) : Promise<boolean>{
        log.verbose(`CFNode::init_sig_part_i(${JSON.stringify(lock_info)})`);

        let hash = calculate_object_hash(lock_info);
        let coalition : Coalition = await this.cf_connector.read_acknowledments(hash);
        let threshold = this.config.cf_network.threshold;

        if (coalition.members.length >= threshold){
            if (await this.start_sig_part_i(lock_info, coalition)){
                log.info(`CFNode::init_sig_part_i - successufully started (${JSON.stringify(lock_info)}, ${JSON.stringify(coalition)})`);
                return true;
            } else {
                log.error(`CFNode::init_sig_part_i - failed to start (${JSON.stringify(lock_info)}, ${JSON.stringify(coalition)})`);
                return false;
            }
        } else {
            log.debug(`CFNode::init_sig_part_i - Coalition is not gathered yet for ${lock_info.tx_hash.hex}. ${coalition.members.length} of ${threshold} agreed`);
            return false;
        }
    }

    async start_sig_part_ii(lock_info, sigs_i : Array<SigShare>) : Promise<boolean>{
        log.verbose(`CFNode::start_sig_part_ii(${JSON.stringify(lock_info)}, ${JSON.stringify(sigs_i)})`);
        let sig_part_ii : SigPartII = await ShamirMath.create_sig_part_ii(this.config.cf_network.node_id, sigs_i);
        if (!sig_part_ii){
            return false;
        }
        await this.cf_connector.send_sig_part_ii(lock_info, sig_part_ii);
        log.debug(`CFNode::start_sig_part_ii - sig_part_ii = ${JSON.stringify(sig_part_ii)}`);
        return true;
    }

    async init_sig_part_ii(lock_info : LockInfo) : Promise<boolean>{
        log.verbose(`CFNode::init_sig_part_ii(${JSON.stringify(lock_info)})`);

        let hash = calculate_object_hash(lock_info);
        let sigs_i : Array<SigShare> = await this.cf_connector.read_sigs_i(hash, this.config.cf_network.node_id);
        let threshold = this.config.cf_network.threshold;

        log.silly(`CFNode::init_sig_part_ii - sigs_i = ${JSON.stringify(sigs_i)}`);

        if (!sigs_i){
            log.debug(`CFNode::init_sig_part_ii - No sigs_i read`);
            return false;
        }

        if (sigs_i.length >= threshold){
            return await this.start_sig_part_ii(lock_info, sigs_i);
        } else {
            log.debug(`CFNode::init_sig_part_ii - Not enough sigs_i for processing ${JSON.stringify(lock_info)}. ${sigs_i.length} of ${threshold} sent shares_i`);
            return false;
        }
    }

    async start_signature(lock_info, sigs_ii : Array<SigPartII>) {
        let signature = await ShamirMath.create_signature(sigs_ii);        
        return signature;
    }

    async init_signature(lock_info : LockInfo){
        log.verbose(`CFNode::init_signature(${JSON.stringify(lock_info)})`);

        let hash = calculate_object_hash(lock_info);
        let sigs_ii : Array<SigPartII> = await this.cf_connector.read_sigs_ii(hash);
        let threshold = this.config.cf_network.threshold;

        if (sigs_ii.length >= threshold){
            return await this.start_signature(lock_info, sigs_ii);
        } else {
            log.debug(`Not enough sigs_ii for processing ${JSON.stringify(lock_info)}. ${threshold} of ${sigs_ii.length} agreed`);
            return false;
        }
    }

    /**
     * Initializes CFNode instance (creates network interfaces, loads token info).
     */
    async init(){
        log.verbose(`CFNode::init())`);
        await this.init_connectors();
        await this.load_token_match_info();
    }

    /**
     * Creates instances of connectors for each network specified in config.
     */

    async init_connectors(){
        log.verbose(`CFNode::init_connectors())`);

        if (this.config.cf_network.__type == "StubConfig"){
            this.cf_connector = new StubConnector(this.config.cf_network.rpc);
        } else if (this.config.cf_network.__type == "EtherConfig"){
            this.cf_connector = new EthereumConnector(this.config.cf_network.rpc);
        } else {
            log.error(`Failed to create connector for cf_network ${JSON.stringify(this.config.cf_network)}`);
        }

        this.networks = [];
        this.config.networks.forEach(network => {
            if (network.__type == "StubConfig"){
                this.networks.push({network_id : network.network_id, iface: new StubConnector(network.filename)});
            } else if (network.__type == "EtherConfig"){
                this.networks.push({network_id : network.network_id, iface: new EthereumConnector(network.rpc)});
            } else {
                log.error(`Failed to create connector for config ${network}`);
            }
        })
    }
}